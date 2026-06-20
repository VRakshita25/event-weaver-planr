import { supabase } from "@/integrations/supabase/client";

export interface EventRow {
  id: string;
  user_id: string;
  workspace_id: string;
  title: string;
  notes: string | null;
  event_date: string; // YYYY-MM-DD
  color: string;
  created_at: string;
  updated_at: string;
}

export async function listEventsBetween(
  workspaceId: string,
  startISO: string,
  endISO: string,
): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("event_date", startISO)
    .lte("event_date", endISO)
    .order("event_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function createEvent(input: {
  workspace_id: string;
  title: string;
  notes: string | null;
  event_date: string;
  color: string;
}) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");
  const { error, data } = await supabase
    .from("events")
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single();
  if (error) throw error;
  return data as EventRow;
}

export async function updateEvent(
  id: string,
  patch: Partial<Pick<EventRow, "title" | "notes" | "event_date" | "color">>,
) {
  const { error, data } = await supabase
    .from("events")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as EventRow;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}
