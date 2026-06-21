-- Attach the owner-as-member trigger so newly created workspaces immediately have the owner in workspace_members.
-- Without this, the INSERT returning row fails the SELECT RLS check and surfaces as
-- "new row violates row-level security policy for table workspaces".
DROP TRIGGER IF EXISTS workspaces_add_owner_member ON public.workspaces;
CREATE TRIGGER workspaces_add_owner_member
AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

-- Also (re)attach the 50-member cap trigger and the updated_at trigger in case they were missing.
DROP TRIGGER IF EXISTS workspace_members_cap ON public.workspace_members;
CREATE TRIGGER workspace_members_cap
BEFORE INSERT ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_member_cap();

DROP TRIGGER IF EXISTS workspaces_set_updated_at ON public.workspaces;
CREATE TRIGGER workspaces_set_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS events_set_updated_at ON public.events;
CREATE TRIGGER events_set_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill: any existing workspace whose owner isn't in workspace_members should be added.
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, w.owner_id, 'owner'
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_members m
  WHERE m.workspace_id = w.id AND m.user_id = w.owner_id
);