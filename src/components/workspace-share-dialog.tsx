import { useEffect, useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getWorkspaceShareToken, type Workspace } from "@/lib/workspaces-api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace | null;
}

export function WorkspaceShareDialog({ open, onOpenChange, workspace }: Props) {
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !workspace) {
      setToken(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getWorkspaceShareToken(workspace.id)
      .then((t) => {
        if (!cancelled) setToken(t);
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

  const url =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/join/${token}`
      : token
        ? `/join/${token}`
        : "";

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share "{workspace.name}"</DialogTitle>
          <DialogDescription>
            Anyone with this link can join and edit events in this workspace. Up to 50 members.
          </DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
