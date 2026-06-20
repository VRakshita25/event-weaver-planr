
-- 1. workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  share_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 2. workspace_members table
CREATE TABLE public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 3. Security-definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = _workspace_id AND owner_id = _user_id
  )
$$;

-- 4. Workspaces RLS
CREATE POLICY "Members can view their workspaces" ON public.workspaces
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(id, auth.uid()));

CREATE POLICY "Users can create workspaces they own" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their workspaces" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their workspaces" ON public.workspaces
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- 5. workspace_members RLS
CREATE POLICY "Members can view memberships of their workspaces" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- Joining: user adds themselves as editor; only allowed if workspace is public OR they are the owner (for initial owner row)
CREATE POLICY "Users can join workspaces" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      role = 'editor'
      AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.visibility = 'public')
      OR (role = 'owner' AND public.is_workspace_owner(workspace_id, auth.uid()))
    )
  );

-- Members can leave; owner can remove anyone
CREATE POLICY "Members can leave or owner can remove" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_owner(workspace_id, auth.uid()));

-- 6. Cap at 50 members per workspace
CREATE OR REPLACE FUNCTION public.enforce_workspace_member_cap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.workspace_members WHERE workspace_id = NEW.workspace_id) >= 50 THEN
    RAISE EXCEPTION 'Workspace is full (50 members maximum)';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER workspace_member_cap
  BEFORE INSERT ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_member_cap();

-- 7. Auto-add owner as member when workspace is created
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER workspaces_add_owner_member
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

-- 8. Backfill: create a Personal workspace for every existing user
INSERT INTO public.workspaces (owner_id, name, visibility)
SELECT id, 'Personal', 'private' FROM auth.users
ON CONFLICT DO NOTHING;

-- 9. Add workspace_id to events
ALTER TABLE public.events ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Backfill events with each user's personal workspace (the one we just created, or earliest owned)
UPDATE public.events e
SET workspace_id = (
  SELECT w.id FROM public.workspaces w
  WHERE w.owner_id = e.user_id
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE workspace_id IS NULL;

ALTER TABLE public.events ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX events_workspace_id_idx ON public.events(workspace_id);

-- 10. Replace events RLS: scope by workspace membership instead of user_id
DROP POLICY IF EXISTS "Users view own events" ON public.events;
DROP POLICY IF EXISTS "Users insert own events" ON public.events;
DROP POLICY IF EXISTS "Users update own events" ON public.events;
DROP POLICY IF EXISTS "Users delete own events" ON public.events;

CREATE POLICY "Members view workspace events" ON public.events
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members insert workspace events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Members update workspace events" ON public.events
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members delete workspace events" ON public.events
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- 11. updated_at trigger for workspaces
CREATE TRIGGER workspaces_set_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 12. Update handle_new_user to also create a personal workspace
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.workspaces (owner_id, name, visibility) VALUES (NEW.id, 'Personal', 'private');
  RETURN NEW;
END;
$$;

-- 13. Public lookup of a workspace by share token (for the join page preview).
-- Read-only, returns only safe fields. SECURITY DEFINER so it bypasses RLS for token holders.
CREATE OR REPLACE FUNCTION public.get_workspace_by_token(_token uuid)
RETURNS TABLE (id uuid, name text, visibility text, owner_id uuid, member_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.id, w.name, w.visibility, w.owner_id,
         (SELECT count(*) FROM public.workspace_members m WHERE m.workspace_id = w.id)
  FROM public.workspaces w
  WHERE w.share_token = _token AND w.visibility = 'public'
$$;
GRANT EXECUTE ON FUNCTION public.get_workspace_by_token(uuid) TO authenticated;
