-- Restore Data API privileges without exposing workspace share tokens.
GRANT SELECT (id, owner_id, name, visibility, created_at, updated_at) ON public.workspaces TO authenticated;
GRANT INSERT (owner_id, name, visibility) ON public.workspaces TO authenticated;
GRANT UPDATE (name, visibility) ON public.workspaces TO authenticated;
GRANT DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;

GRANT SELECT, INSERT, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

-- Make the just-created workspace visible to its owner even before/without member backfill.
DROP POLICY IF EXISTS "Members can view their workspaces" ON public.workspaces;
CREATE POLICY "Members can view their workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (owner_id = auth.uid() OR public.is_workspace_member(id, auth.uid()));

-- Keep creation restricted to the signed-in owner.
DROP POLICY IF EXISTS "Users can create workspaces they own" ON public.workspaces;
CREATE POLICY "Users can create workspaces they own"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Ensure owners can edit workspace name/visibility only on their own workspaces.
DROP POLICY IF EXISTS "Owners can update their workspaces" ON public.workspaces;
CREATE POLICY "Owners can update their workspaces"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Ensure owners can delete only their own workspaces.
DROP POLICY IF EXISTS "Owners can delete their workspaces" ON public.workspaces;
CREATE POLICY "Owners can delete their workspaces"
ON public.workspaces
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Reattach required triggers if a previous migration created functions but not triggers.
DROP TRIGGER IF EXISTS workspaces_add_owner_member ON public.workspaces;
CREATE TRIGGER workspaces_add_owner_member
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.add_owner_as_member();

DROP TRIGGER IF EXISTS workspace_members_cap ON public.workspace_members;
CREATE TRIGGER workspace_members_cap
BEFORE INSERT ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.enforce_workspace_member_cap();

DROP TRIGGER IF EXISTS workspaces_set_updated_at ON public.workspaces;
CREATE TRIGGER workspaces_set_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS events_set_updated_at ON public.events;
CREATE TRIGGER events_set_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Backfill owner membership for any existing workspaces that were created while the trigger was missing.
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, w.owner_id, 'owner'
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1
  FROM public.workspace_members m
  WHERE m.workspace_id = w.id
    AND m.user_id = w.owner_id
)
ON CONFLICT DO NOTHING;

-- Ensure invite RPCs remain callable by signed-in users only.
REVOKE EXECUTE ON FUNCTION public.get_workspace_by_token(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_workspace_by_token(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_by_token(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_workspace_editor_token(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_workspace_editor_token(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_editor_token(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_workspace_viewer_token(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_workspace_viewer_token(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_viewer_token(uuid) TO authenticated;