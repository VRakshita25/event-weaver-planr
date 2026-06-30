import { useEffect, useState } from "react";
import { Copy, Check, Loader2, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getWorkspaceEditorToken,
  getWorkspaceViewerToken,
  type Workspace,
} from "@/lib/workspaces-api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace | null;
}

export function WorkspaceShareDialog({ open, onOpenChange, workspace }: Props) {
  const [editorToken, setEditorToken] = useState<string | null>(null);
  const [viewerToken, setViewerToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !workspace) {
      setEditorToken(null);
      setViewerToken(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getWorkspaceEditorToken(workspace.id),
      getWorkspaceViewerToken(workspace.id),
    ])
      .then(([e, v]) => {
        if (cancelled) return;
        setEditorToken(e);
        setViewerToken(v);
      })
      .catch((e: Error) => {
        if (!cancelled) toast.error(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, workspace]);

  if (!workspace) return null;

  const origin = getShareOrigin();
  const editorUrl = editorToken ? `${origin}/join/${editorToken}` : "";
  const viewerUrl = viewerToken ? `${origin}/join/${viewerToken}` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share "{workspace.name}"</DialogTitle>
          <DialogDescription>
            Send the right link for the access you want each person to have. Anyone who opens
            a link must sign in (or register) to join. Up to 50 members per workspace.
          </DialogDescription>
        </DialogHeader>

        <LinkRow
          icon={<Pencil className="h-4 w-4" />}
          label="Editor link"
          hint="They can view, add, edit and delete events."
          url={editorUrl}
          loading={loading}
        />
        <LinkRow
          icon={<Eye className="h-4 w-4" />}
          label="View-only link"
          hint="They can see events but cannot change anything."
          url={viewerUrl}
          loading={loading}
        />
      </DialogContent>
    </Dialog>
  );
}

function LinkRow({
  icon, label, hint, url, loading,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  url: string;
  loading: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex gap-2">
        <Input
          readOnly
          value={loading ? "Loading…" : url}
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button onClick={copy} variant="secondary" disabled={loading || !url}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
