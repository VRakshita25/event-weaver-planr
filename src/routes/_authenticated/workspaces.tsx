import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Lock, Plus, Share2, Trash2, LogOut, Users, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  createWorkspace, deleteWorkspace, leaveWorkspace, listMembers, updateWorkspace,
  type Workspace,
} from "@/lib/workspaces-api";
import { useWorkspaces } from "@/lib/workspace-context";
import { useAuth } from "@/lib/auth-context";
import { WorkspaceShareDialog } from "@/components/workspace-share-dialog";

export const Route = createFileRoute("/_authenticated/workspaces")({
  head: () => ({ meta: [{ title: "Workspaces — Planr" }] }),
  component: WorkspacesPage,
});

function WorkspacesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspaces, setCurrentId } = useWorkspaces();
  const [newOpen, setNewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<Workspace | null>(null);
  const [editTarget, setEditTarget] = useState<Workspace | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Workspaces</h1>
          <p className="text-sm text-muted-foreground">
            Create separate calendars for different groups. Share public ones with up to 50 people.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> New workspace
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {workspaces.map((w) => (
          <WorkspaceCard
            key={w.id}
            workspace={w}
            isOwner={w.owner_id === user?.id}
            onOpen={() => {
              setCurrentId(w.id);
              navigate({ to: "/calendar" });
            }}
            onShare={() => {
              setShareTarget(w);
              setShareOpen(true);
            }}
            onEdit={() => setEditTarget(w)}
            onDeleted={() => qc.invalidateQueries({ queryKey: ["workspaces"] })}
          />
        ))}
      </div>

      <NewWorkspaceDialog open={newOpen} onOpenChange={setNewOpen} />
      <WorkspaceShareDialog open={shareOpen} onOpenChange={setShareOpen} workspace={shareTarget} />
      <EditWorkspaceDialog
        workspace={editTarget}
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
      />
    </div>
  );
}

function WorkspaceCard({
  workspace, isOwner, onOpen, onShare, onEdit, onDeleted,
}: {
  workspace: Workspace;
  isOwner: boolean;
  onOpen: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", workspace.id],
    queryFn: () => listMembers(workspace.id),
  });

  const remove = useMutation({
    mutationFn: () => deleteWorkspace(workspace.id),
    onSuccess: () => {
      toast.success("Workspace deleted");
      onDeleted();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const leave = useMutation({
    mutationFn: () => leaveWorkspace(workspace.id, user!.id),
    onSuccess: () => {
      toast.success("Left workspace");
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {workspace.visibility === "public" ? (
              <Globe className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
            <h3 className="truncate font-semibold">{workspace.name}</h3>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {members.length} {members.length === 1 ? "member" : "members"} •{" "}
            {workspace.visibility === "public" ? "Public (shareable)" : "Private"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onOpen}>
          Open calendar
        </Button>
        {isOwner && workspace.visibility === "public" && (
          <Button size="sm" variant="outline" onClick={onShare}>
            <Share2 className="mr-1 h-4 w-4" /> Share
          </Button>
        )}
        {isOwner && (
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Settings2 className="mr-1 h-4 w-4" /> Edit
          </Button>
        )}
        {isOwner ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm(`Delete "${workspace.name}" and all its events?`)) remove.mutate();
            }}
            disabled={remove.isPending}
          >
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm(`Leave "${workspace.name}"?`)) leave.mutate();
            }}
            disabled={leave.isPending}
          >
            <LogOut className="mr-1 h-4 w-4" /> Leave
          </Button>
        )}
      </div>
    </div>
  );
}

function NewWorkspaceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { setCurrentId } = useWorkspaces();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");

  const create = useMutation({
    mutationFn: () => createWorkspace({ name: name.trim(), visibility }),
    onSuccess: (w) => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      setCurrentId(w.id);
      toast.success("Workspace created");
      onOpenChange(false);
      setName("");
      setVisibility("private");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
          <DialogDescription>
            A separate calendar. Choose public if you want to share it with others.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ws-name">Name</Label>
            <Input
              id="ws-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Study group, Family"
            />
          </div>
          <div className="space-y-2">
            <Label>Visibility</Label>
            <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as "private" | "public")}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary">
                <RadioGroupItem value="private" id="v-priv" className="mt-1" />
                <div>
                  <div className="font-medium">Private</div>
                  <div className="text-xs text-muted-foreground">Only you can see it. No sharing.</div>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary">
                <RadioGroupItem value="public" id="v-pub" className="mt-1" />
                <div>
                  <div className="font-medium">Public</div>
                  <div className="text-xs text-muted-foreground">
                    Share a link. Anyone with it can join and edit. Up to 50 members.
                  </div>
                </div>
              </label>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!name.trim()) return toast.error("Name is required");
              create.mutate();
            }}
            disabled={create.isPending}
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
