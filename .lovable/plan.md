# Event Planner App — Plan

A personal event planning app with a calendar at the center. You plan ahead by adding events to specific dates (e.g. "Maths exam Tuesday", "Physics exam Wednesday"), edit/delete them, colour-code them, and switch the app's overall look.

## Core features

1. **Login / signup** (email + password)
   - Signup page, login page, logout button
   - Each user only sees their own events

2. **Calendar view** with month/week toggle
   - Month grid: see the whole month at a glance with coloured event dots/pills
   - Week view: see the current week with events laid out per day
   - Click a day → see all events on that day in a side panel/dialog
   - Click an event → edit or delete it
   - Navigate prev/next month or week, "Today" button

3. **Events**
   - Fields: title, date, notes/description, colour
   - Add event (from a "+" button or by clicking a day)
   - Edit event (title, date, notes, colour)
   - Delete event (with confirm)

4. **Customisation**
   - Per-event colour picker (palette of ~8 preset colours)
   - Settings page for app theme: light / dark, plus a few accent colour choices
   - Theme preference saved per user

## Pages / routes

- `/login` — login form
- `/signup` — signup form
- `/` (protected) — calendar (main view, month/week toggle)
- `/settings` (protected) — theme + accent customisation, logout

Protected routes redirect to `/login` if not signed in.

## Visual design direction

Clean, modern, calm — think a focused study companion, not a corporate planner.
- Generous whitespace, rounded corners, soft shadows
- Calendar grid as the hero; events appear as small coloured pills with the title
- Smooth transitions when switching month/week
- Light + dark mode with a choice of accent colours (indigo, emerald, rose, amber)
- Typography: a distinctive display font for headings, clean sans for body

## Technical details

- **Stack**: existing TanStack Start template + Lovable Cloud (Supabase) for auth & data
- **Database tables**:
  - `events` — `id`, `user_id`, `title`, `notes`, `event_date`, `color`, `created_at`
  - `profiles` — `id` (= auth.users.id), `theme` (light/dark), `accent` (indigo/emerald/rose/amber)
  - RLS: each user can only select/insert/update/delete their own rows
  - Trigger to auto-create a profile row on signup
- **Auth**: email + password via Supabase, session listener at root, `_authenticated` layout route to gate the calendar and settings
- **Calendar**: built with `date-fns` for date math; shadcn components for dialogs, buttons, inputs; custom month/week grid (not the date-picker calendar, which is for single-date selection)
- **State**: TanStack Query for events list, invalidated after add/edit/delete
- **Theme**: applied by toggling a `dark` class on `<html>` and swapping accent CSS variables in `styles.css`

## Out of scope (can add later)

- Recurring events, reminders/notifications, event times (only dates for now), sharing, Google sign-in, drag-to-move events between days
