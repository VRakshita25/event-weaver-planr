import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  addMonths, addWeeks, endOfMonth, endOfWeek, format,
  startOfMonth, startOfWeek, subMonths, subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listEventsBetween, type EventRow } from "@/lib/events-api";
import { MonthView, WeekView } from "@/components/calendar-views";
import { EventDialog } from "@/components/event-dialog";
import { DayEventsDialog } from "@/components/day-events-dialog";


export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Planr" }] }),
  component: CalendarPage,
});

type Mode = "month" | "week";

function CalendarPage() {
  const [mode, setMode] = useState<Mode>("month");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();

  const range = useMemo(() => {
    if (mode === "month") {
      return {
        start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
      };
    }
    return {
      start: startOfWeek(cursor, { weekStartsOn: 1 }),
      end: endOfWeek(cursor, { weekStartsOn: 1 }),
    };
  }, [mode, cursor]);

  const startISO = format(range.start, "yyyy-MM-dd");
  const endISO = format(range.end, "yyyy-MM-dd");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", startISO, endISO],
    queryFn: () => listEventsBetween(startISO, endISO),
  });

  const title =
    mode === "month"
      ? format(cursor, "MMMM yyyy")
      : `Week of ${format(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM")}`;

  const prev = () => setCursor(mode === "month" ? subMonths(cursor, 1) : subWeeks(cursor, 1));
  const next = () => setCursor(mode === "month" ? addMonths(cursor, 1) : addWeeks(cursor, 1));

  const onDayClick = (date: Date) => {
    setEditing(null);
    setDefaultDate(format(date, "yyyy-MM-dd"));
    setDialogOpen(true);
  };

  const onEventClick = (evt: EventRow) => {
    setEditing(evt);
    setDefaultDate(undefined);
    setDialogOpen(true);
  };

  const onNew = () => {
    setEditing(null);
    setDefaultDate(format(new Date(), "yyyy-MM-dd"));
    setDialogOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Plan exams, deadlines and personal events.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={prev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={next} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={onNew}>
            <Plus className="mr-1 h-4 w-4" /> New event
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Loading events…
        </div>
      ) : mode === "month" ? (
        <MonthView cursor={cursor} events={events} onDayClick={onDayClick} onEventClick={onEventClick} />
      ) : (
        <WeekView cursor={cursor} events={events} onDayClick={onDayClick} onEventClick={onEventClick} />
      )}

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editing}
        defaultDate={defaultDate}
      />
    </div>
  );
}
