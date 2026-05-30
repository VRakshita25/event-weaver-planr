import { createFileRoute } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useTheme, type Accent, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Planr" }] }),
  component: SettingsPage,
});

const ACCENTS: { key: Accent; label: string; swatch: string }[] = [
  { key: "indigo", label: "Indigo", swatch: "oklch(0.50 0.18 270)" },
  { key: "emerald", label: "Emerald", swatch: "oklch(0.55 0.15 155)" },
  { key: "rose", label: "Rose", swatch: "oklch(0.58 0.20 15)" },
  { key: "amber", label: "Amber", swatch: "oklch(0.65 0.16 75)" },
];

function SettingsPage() {
  const { theme, accent, setTheme, setAccent } = useTheme();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Make Planr feel like yours.</p>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose how the interface looks.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(["light", "dark"] as ThemeMode[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-background p-4 text-left transition",
                theme === t ? "ring-2 ring-primary" : "hover:bg-accent/50",
              )}
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted">
                {t === "light" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </span>
              <span className="font-medium capitalize">{t}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Accent colour</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Used for buttons, highlights and the current day.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              onClick={() => setAccent(a.key)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border bg-background p-4 transition",
                accent === a.key ? "ring-2 ring-primary" : "hover:bg-accent/50",
              )}
            >
              <span className="h-8 w-8 rounded-full" style={{ backgroundColor: a.swatch }} />
              <span className="text-sm font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
