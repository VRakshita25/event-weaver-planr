import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getWorkspaceByToken, joinWorkspace } from "@/lib/workspaces-api";
import { useWorkspaces } from "@/lib/workspace-context";

export const Route = createFileRoute("/_authenticated/join/$token")({
  head: () => ({ meta: [{ title: "Join workspace — Planr" }] }),
  component: JoinPage,
});

function JoinPage() {
  const { token } = useParams({ from: "/_authenticated/join/$token" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { setCurrentId } = useWorkspaces();

  const { data, isLoading, error } = useQuery({
    queryKey: ["workspace-by-token", token],
    queryFn: () => getWorkspaceByToken(token),
  });

  const join = useMutation({
    mutationFn: () => joinWorkspace(data!.id, data!.join_role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      setCurrentId(data!.id);
      toast.success(`Joined ${data!.name}`);
      navigate({ to: "/calendar" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="rounded-2xl border bg-card p-6 text-center">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error || !data ? (
          <>
            <h1 className="font-display text-2xl font-semibold">Invalid link</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This workspace doesn't exist or is no longer public.
            </p>
            <Button className="mt-4" onClick={() => navigate({ to: "/calendar" })}>
              Go to calendar
            </Button>
          </>
        ) : (
          <>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Globe className="h-6 w-6" />
            </div>
            <h1 className="mt-3 font-display text-2xl font-semibold">{data.name}</h1>
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {data.member_count} / 50 members
            </p>
            <p className="mt-4 text-sm">
              You've been invited as{" "}
              <span className="font-semibold">
                {data.join_role === "editor" ? "an editor" : "a viewer"}
              </span>
              .{" "}
              {data.join_role === "editor"
                ? "You can view, add, edit and delete events."
                : "You can see events but cannot change them."}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" onClick={() => navigate({ to: "/calendar" })}>
                Cancel
              </Button>
              <Button onClick={() => join.mutate()} disabled={join.isPending || data.member_count >= 50}>
                {join.isPending ? "Joining…" : data.member_count >= 50 ? "Workspace full" : "Join workspace"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
