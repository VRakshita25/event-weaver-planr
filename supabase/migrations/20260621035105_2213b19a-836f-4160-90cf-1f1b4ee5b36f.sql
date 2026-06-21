-- 1) Privilege escalation fix: restrict workspace_members INSERT to editor-only self-joins
--    on public workspaces. The owner row is created by the add_owner_as_member trigger,
--    never via a direct INSERT, so removing the "owner" branch is safe.
DROP POLICY IF EXISTS "Users can join workspaces" ON public.workspace_members;
CREATE POLICY "Editors can join public workspaces"
  ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'editor'
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_members.workspace_id
        AND w.visibility = 'public'
    )
  );

-- 2) Add an explicit restrictive UPDATE policy so future migrations cannot accidentally
--    enable role updates. All role changes must go through controlled server logic.
DROP POLICY IF EXISTS "No direct member updates" ON public.workspace_members;
CREATE POLICY "No direct member updates"
  ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

-- 3) Hide share_token from non-owners using column-level grants.
--    Members keep read access to everything except share_token; owners fetch the
--    token via a SECURITY DEFINER RPC.
REVOKE SELECT ON public.workspaces FROM authenticated;
GRANT SELECT (id, owner_id, name, visibility, created_at, updated_at)
  ON public.workspaces TO authenticated;

CREATE OR REPLACE FUNCTION public.get_workspace_share_token(_workspace_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT share_token
  FROM public.workspaces
  WHERE id = _workspace_id
    AND owner_id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.get_workspace_share_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_share_token(uuid) TO authenticated;

-- 4) Lock down trigger helpers from public API exposure. Trigger functions are invoked
--    by the database engine and do not need EXECUTE for end users.
REVOKE EXECUTE ON FUNCTION public.enforce_workspace_member_cap() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_owner_as_member() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;

-- 5) get_workspace_by_token is only used from authenticated routes. Restrict from anon.
REVOKE EXECUTE ON FUNCTION public.get_workspace_by_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_by_token(uuid) TO authenticated;