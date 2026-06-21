-- 1) Add a second per-workspace token for view-only access.
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS viewer_token uuid NOT NULL DEFAULT gen_random_uuid();

-- 2) Column-level grants: ensure neither token is exposed via SELECT *.
REVOKE SELECT ON public.workspaces FROM authenticated;
GRANT SELECT (id, owner_id, name, visibility, created_at, updated_at)
  ON public.workspaces TO authenticated;

-- 3) Helper: does this user have write access (owner or editor) on the workspace?
CREATE OR REPLACE FUNCTION public.has_workspace_write_role(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
      AND role IN ('owner', 'editor')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_workspace_write_role(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_workspace_write_role(uuid, uuid) TO authenticated;

-- 4) Rewire events policies: viewers can read, only owner/editor can write.
DROP POLICY IF EXISTS "Members insert workspace events" ON public.events;
CREATE POLICY "Editors insert workspace events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_workspace_write_role(workspace_id, auth.uid())
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Members update workspace events" ON public.events;
CREATE POLICY "Editors update workspace events"
  ON public.events FOR UPDATE TO authenticated
  USING (public.has_workspace_write_role(workspace_id, auth.uid()))
  WITH CHECK (public.has_workspace_write_role(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members delete workspace events" ON public.events;
CREATE POLICY "Editors delete workspace events"
  ON public.events FOR DELETE TO authenticated
  USING (public.has_workspace_write_role(workspace_id, auth.uid()));

-- (SELECT already allows any member — viewers included — via is_workspace_member.)

-- 5) Replace join policy: allow editor OR viewer self-joins on public workspaces,
--    and require the role to match the chosen branch. Owner rows are inserted
--    by add_owner_as_member trigger only.
DROP POLICY IF EXISTS "Editors can join public workspaces" ON public.workspace_members;
CREATE POLICY "Users can join public workspaces"
  ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role IN ('editor', 'viewer')
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_members.workspace_id
        AND w.visibility = 'public'
    )
  );

-- 6) Token lookup: accept either token, return which role it grants.
DROP FUNCTION IF EXISTS public.get_workspace_by_token(uuid);
CREATE OR REPLACE FUNCTION public.get_workspace_by_token(_token uuid)
RETURNS TABLE (
  id uuid,
  name text,
  visibility text,
  owner_id uuid,
  member_count bigint,
  join_role text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    w.id,
    w.name,
    w.visibility,
    w.owner_id,
    (SELECT count(*) FROM public.workspace_members m WHERE m.workspace_id = w.id),
    CASE
      WHEN w.share_token  = _token THEN 'editor'
      WHEN w.viewer_token = _token THEN 'viewer'
    END AS join_role
  FROM public.workspaces w
  WHERE w.visibility = 'public'
    AND (w.share_token = _token OR w.viewer_token = _token)
$$;
REVOKE EXECUTE ON FUNCTION public.get_workspace_by_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_by_token(uuid) TO authenticated;

-- 7) Owner-only token fetchers (replace older single-token RPC).
CREATE OR REPLACE FUNCTION public.get_workspace_editor_token(_workspace_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT share_token FROM public.workspaces
  WHERE id = _workspace_id AND owner_id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.get_workspace_editor_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_editor_token(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_workspace_viewer_token(_workspace_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT viewer_token FROM public.workspaces
  WHERE id = _workspace_id AND owner_id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.get_workspace_viewer_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_viewer_token(uuid) TO authenticated;