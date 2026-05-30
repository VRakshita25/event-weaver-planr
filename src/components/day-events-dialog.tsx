import { format, parseISO } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { eventColorVar } from "@/lib/event-colors";
import { deleteEvent, type EventRow } from "@/lib/events-api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  events: EventRow[];
  onAdd: () => void;
  onEdit: (event: EventRow) => void;
}

export function DayEventsDialog({ open, onOpenChange, date, events, onAdd, onEdit }: Props) {
  const qc = useQueryClient();
  const dayEvents = date ? events.filter((e) => e.event_date === date) : [];

  const remove = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {date ? format(parseISO(date), "EEEE, d MMMM") : "Events"}
          </DialogTitle>
          <DialogDescription>
            {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"} on this day
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-3">
          <div className="flex flex-col gap-2">
            {dayEvents.length === 0 && (
              <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                No events yet. Add your first one.
              </p>
            )}
            {dayEvents.map((evt) => (
              <div
                key={evt.id}
                className="group flex items-start gap-3 rounded-lg border bg-card p-3"
              >
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: eventColorVar(evt.color) }}
                />
                <button
                  onClick={() => onEdit(evt)}
                  className="flex-1 text-left"
                >
                  <div className="font-medium">{evt.title}</div>
                  {evt.notes && (
                    <div className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                      {evt.notes}
                    </div>
                  )}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate(evt.id)}
                  disabled={remove.isPending}
                  aria-label="Delete event"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Button onClick={onAdd} className="w-full">
          <Plus className="mr-1 h-4 w-4" /> Add event
        </Button>
      </DialogContent>
    </Dialog>
  );
}
