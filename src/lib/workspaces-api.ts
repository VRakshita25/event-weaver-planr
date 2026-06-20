import { supabase } from "@/integrations/supabase/client";

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  visibility: "private" | "public";
  share_token: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: "owner" | "editor";
  joined_at: string;
}

export async function listMyWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Workspace[];
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const { data, error } = await supabase.from("workspaces").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Workspace | null;
}

export async function createWorkspace(input: { name: string; visibility: "private" | "public" }) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name: input.name, visibility: input.visibility, owner_id: userData.user.id })
    .select()
    .single();
  if (error) throw error;
  return data as Workspace;
}

export async function updateWorkspace(
  id: string,
  patch: Partial<Pick<Workspace, "name" | "visibility">>,
) {
  const { data, error } = await supabase
    .from("workspaces")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Workspace;
}

export async function deleteWorkspace(id: string) {
  const { error } = await supabase.from("workspaces").delete().eq("id", id);
  if (error) throw error;
}

export async function listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkspaceMember[];
}

export async function leaveWorkspace(workspaceId: string, userId: string) {
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  if (error) throw error;
}

export interface PublicWorkspacePreview {
  id: string;
  name: string;
  visibility: string;
  owner_id: string;
  member_count: number;
}

export async function getWorkspaceByToken(token: string): Promise<PublicWorkspacePreview | null> {
  const { data, error } = await supabase.rpc("get_workspace_by_token", { _token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as PublicWorkspacePreview | undefined) ?? null;
}

export async function joinWorkspace(workspaceId: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspaceId, user_id: userData.user.id, role: "editor" });
  if (error && !error.message.toLowerCase().includes("duplicate")) throw error;
}
