import { Check, ChevronsUpDown, Plus, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useWorkspaces } from "@/lib/workspace-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
  const { workspaces, current, setCurrentId } = useWorkspaces();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 max-w-[200px]">
          <Users className="h-4 w-4 shrink-0" />
          <span className="truncate">{current?.name ?? "Workspace"}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((w) => (
          <DropdownMenuItem
            key={w.id}
            onClick={() => setCurrentId(w.id)}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2 truncate">
              <span className="truncate">{w.name}</span>
              <span className="text-xs text-muted-foreground">
                {w.visibility === "public" ? "Public" : "Private"}
              </span>
            </span>
            <Check
              className={cn(
                "h-4 w-4 shrink-0",
                current?.id === w.id ? "opacity-100" : "opacity-0",
              )}
            />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/workspaces" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Manage workspaces
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
