import {
  addDays, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek,
} from "date-fns";
import { eventColorVar } from "@/lib/event-colors";
import type { EventRow } from "@/lib/events-api";
import { cn } from "@/lib/utils";

interface ViewProps {
  cursor: Date;
  events: EventRow[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: EventRow) => void;
}

function eventsOnDay(events: EventRow[], day: Date) {
  const iso = format(day, "yyyy-MM-dd");
  return events.filter((e) => e.event_date === iso);
}

export function MonthView({ cursor, events, onDayClick, onEventClick }: ViewProps) {
  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
        {weekdays.map((d) => (
          <div key={d} className="px-2 py-2 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsOnDay(events, day);
          const inMonth = isSameMonth(day, cursor);
          const today = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "group relative flex min-h-[110px] flex-col gap-1 border-b border-r p-2 text-left transition-colors hover:bg-accent/50",
                !inMonth && "bg-muted/20 text-muted-foreground",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full text-xs font-medium",
                    today && "bg-primary text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {dayEvents.slice(0, 3).map((evt) => (
                  <span
                    key={evt.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
                    className="truncate rounded-md px-1.5 py-0.5 text-xs font-medium text-white shadow-sm hover:opacity-90"
                    style={{ backgroundColor: eventColorVar(evt.color) }}
                  >
                    {evt.title}
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className="px-1 text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WeekView({ cursor, events, onDayClick, onEventClick }: ViewProps) {
  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((day) => {
        const dayEvents = eventsOnDay(events, day);
        const today = isToday(day);
        const isCurrent = isSameDay(day, cursor);
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "flex min-h-[280px] flex-col overflow-hidden rounded-2xl border bg-card transition",
              isCurrent && "ring-2 ring-primary",
            )}
          >
            <button
              onClick={() => onDayClick(day)}
              className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-left hover:bg-accent/50"
            >
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {format(day, "EEE")}
                </div>
                <div className={cn("text-lg font-semibold", today && "text-primary")}>
                  {format(day, "d MMM")}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">+</span>
            </button>
            <div className="flex flex-1 flex-col gap-1.5 p-2">
              {dayEvents.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted-foreground/70">No events</p>
              ) : (
                dayEvents.map((evt) => (
                  <button
                    key={evt.id}
                    onClick={() => onEventClick(evt)}
                    className="rounded-lg px-2 py-1.5 text-left text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                    style={{ backgroundColor: eventColorVar(evt.color) }}
                  >
                    <div className="truncate">{evt.title}</div>
                    {evt.notes && (
                      <div className="truncate text-xs font-normal text-white/80">{evt.notes}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
