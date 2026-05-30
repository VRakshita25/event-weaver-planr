import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EVENT_COLORS, eventColorVar } from "@/lib/event-colors";
import { createEvent, deleteEvent, updateEvent, type EventRow } from "@/lib/events-api";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Either an existing event to edit, or null to create */
  event: EventRow | null;
  /** Used when creating a new event */
  defaultDate?: string;
}

export function EventDialog({ open, onOpenChange, event, defaultDate }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [color, setColor] = useState<string>("indigo");

  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setNotes(event.notes ?? "");
      setDate(event.event_date);
      setColor(event.color);
    } else {
      setTitle("");
      setNotes("");
      setDate(defaultDate ?? format(new Date(), "yyyy-MM-dd"));
      setColor("indigo");
    }
  }, [open, event, defaultDate]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        notes: notes.trim() ? notes.trim() : null,
        event_date: date,
        color,
      };
      if (!payload.title) throw new Error("Title is required");
      if (!payload.event_date) throw new Error("Date is required");
      if (event) return updateEvent(event.id, payload);
      return createEvent(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success(event ? "Event updated" : "Event added");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!event) return;
      await deleteEvent(event.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event deleted");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>
            {date ? format(parseISO(date), "EEEE, d MMMM yyyy") : "Pick a date"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Maths exam"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Chapters, locations, anything to remember…"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => setColor(c.key)}
                  aria-label={c.label}
                  className={cn(
                    "h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition",
                    color === c.key ? "ring-2 ring-foreground" : "hover:scale-110",
                  )}
                  style={{ backgroundColor: eventColorVar(c.key) }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {event && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : event ? "Save changes" : "Add event"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
