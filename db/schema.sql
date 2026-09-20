-- Run this once against your Postgres database (Vercel Storage -> Postgres
-- -> Query tab, or any Postgres client) after you've created a database and
-- set POSTGRES_URL. Until POSTGRES_URL is set, the app runs against a local
-- JSON file store instead (see src/lib/localStore.ts) so it works without
-- any database at all during development.

create extension if not exists pgcrypto;

create table if not exists checklist_tickets (
  id uuid primary key default gen_random_uuid(),
  tab text not null check (tab in ('yohannes', 'bersabeh', 'yakob', 'logistics')),
  title text not null,
  -- Free text, exactly as typed (e.g. "3:00", "14:30", "3:00 EAT") -- no
  -- AM/PM or 24-hour parsing, no computed duration. Just two labels shown
  -- on the ticket.
  start_time text not null,
  end_time text not null,
  status text not null default 'open' check (status in ('open', 'done')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Drag-to-reorder position. A plain float, not an integer sequence: when a
  -- ticket is dropped between two others, its new position is just the
  -- midpoint of its neighbors' positions, so reordering only ever writes the
  -- one moved row instead of renumbering the whole list.
  position double precision not null default (extract(epoch from clock_timestamp()) * 1000)
);

-- Optional seed rows so the board isn't empty on first load.
insert into checklist_tickets (tab, title, start_time, end_time)
values
  ('yohannes', 'Confirm venue walkthrough time', '9:00', '10:00'),
  ('bersabeh', 'Call the caterer about the final headcount', '2:00', '3:00'),
  ('logistics', 'Print seating chart', '11:00', '12:00')
on conflict do nothing;
