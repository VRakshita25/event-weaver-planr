export const EVENT_COLORS = [
  { key: "indigo", label: "Indigo", varName: "--event-indigo" },
  { key: "emerald", label: "Emerald", varName: "--event-emerald" },
  { key: "rose", label: "Rose", varName: "--event-rose" },
  { key: "amber", label: "Amber", varName: "--event-amber" },
  { key: "sky", label: "Sky", varName: "--event-sky" },
  { key: "violet", label: "Violet", varName: "--event-violet" },
  { key: "slate", label: "Slate", varName: "--event-slate" },
  { key: "orange", label: "Orange", varName: "--event-orange" },
] as const;

export type EventColorKey = (typeof EVENT_COLORS)[number]["key"];

export function eventColorStyle(color: string): React.CSSProperties {
  const found = EVENT_COLORS.find((c) => c.key === color) ?? EVENT_COLORS[0];
  return { backgroundColor: `var(${found.varName})` };
}

export function eventColorVar(color: string): string {
  const found = EVENT_COLORS.find((c) => c.key === color) ?? EVENT_COLORS[0];
  return `var(${found.varName})`;
}
