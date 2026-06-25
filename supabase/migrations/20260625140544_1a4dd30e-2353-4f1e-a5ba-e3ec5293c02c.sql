
CREATE OR REPLACE FUNCTION public.is_workspace_public(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = _workspace_id AND visibility = 'public'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_workspace_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_public(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can join public workspaces" ON public.workspace_members;

CREATE POLICY "Users can join public workspaces"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('editor', 'viewer')
  AND public.is_workspace_public(workspace_id)
);
