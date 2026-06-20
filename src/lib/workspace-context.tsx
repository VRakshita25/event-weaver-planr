import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { listMyWorkspaces, type Workspace } from "./workspaces-api";
import { useAuth } from "./auth-context";

const STORAGE_KEY = "planr.currentWorkspaceId";

interface Ctx {
  workspaces: Workspace[];
  currentId: string | null;
  current: Workspace | null;
  setCurrentId: (id: string) => void;
  loading: boolean;
}

const WorkspaceCtx = createContext<Ctx>({
  workspaces: [],
  currentId: null,
  current: null,
  setCurrentId: () => {},
  loading: true,
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentId, setCurrentIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["workspaces", user?.id ?? "anon"],
    queryFn: listMyWorkspaces,
    enabled: !!user,
  });

  useEffect(() => {
    if (!workspaces.length) return;
    const exists = currentId && workspaces.some((w) => w.id === currentId);
    if (!exists) {
      const personal = workspaces.find((w) => w.owner_id === user?.id) ?? workspaces[0];
      setCurrentIdState(personal.id);
      window.localStorage.setItem(STORAGE_KEY, personal.id);
    }
  }, [workspaces, currentId, user?.id]);

  const setCurrentId = (id: string) => {
    setCurrentIdState(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  };

  const current = useMemo(
    () => workspaces.find((w) => w.id === currentId) ?? null,
    [workspaces, currentId],
  );

  return (
    <WorkspaceCtx.Provider value={{ workspaces, currentId, current, setCurrentId, loading: isLoading }}>
      {children}
    </WorkspaceCtx.Provider>
  );
}

export const useWorkspaces = () => useContext(WorkspaceCtx);
