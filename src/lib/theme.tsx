import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeMode = "light" | "dark";
export type Accent = "indigo" | "emerald" | "rose" | "amber";

interface ThemeCtx {
  theme: ThemeMode;
  accent: Accent;
  setTheme: (t: ThemeMode) => void;
  setAccent: (a: Accent) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function applyToDom(theme: ThemeMode, accent: Accent) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.setAttribute("data-accent", accent);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [accent, setAccentState] = useState<Accent>("indigo");

  // Load from localStorage immediately, then sync with profile when signed in
  useEffect(() => {
    const t = (localStorage.getItem("theme") as ThemeMode) || "light";
    const a = (localStorage.getItem("accent") as Accent) || "indigo";
    setThemeState(t);
    setAccentState(a);
    applyToDom(t, a);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("theme, accent")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (data && !cancelled) {
        const t = (data.theme as ThemeMode) ?? "light";
        const a = (data.accent as Accent) ?? "indigo";
        setThemeState(t);
        setAccentState(a);
        applyToDom(t, a);
        localStorage.setItem("theme", t);
        localStorage.setItem("accent", a);
      }
    };
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const persist = async (patch: { theme?: ThemeMode; accent?: Accent }) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from("profiles").update(patch).eq("id", userData.user.id);
  };

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    applyToDom(t, accent);
    localStorage.setItem("theme", t);
    persist({ theme: t });
  };
  const setAccent = (a: Accent) => {
    setAccentState(a);
    applyToDom(theme, a);
    localStorage.setItem("accent", a);
    persist({ accent: a });
  };

  return (
    <Ctx.Provider value={{ theme, accent, setTheme, setAccent }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
}
