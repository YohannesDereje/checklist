# Fresh Build: Bete Dokimas Team Checklist (standalone)

## What this is

A **standalone rebuild** of just the Team Checklist ticket board — the
tabbed (Yohannes / Bersabeh / Yakob / Logistics / All Tasks) ticket board
with a branded header, percent-complete progress bar, and a collapsible
Completed section. This is the exact same UI and behavior as the one built
in the main `betedokimas_app` project, minus everything unrelated to it
(no client list, no guests/invoices/vendors, no other admin pages).

**Deliberate differences from the original, made for speed and because
this is a short-lived internal tool for 3 known people:**

- **No login, no accounts.** The original gates this behind Supabase Auth
  (admin role). This build has none — anyone who has the deployed URL can
  open it and use it immediately, no sign-in step.
- **The board is fully public** — every checklist_tickets row can be
  read/written by anyone with the link. There is no per-user identity at
  all, so there's no "who created/completed this" tracking either — the
  tab a ticket sits in is its only assignment signal, same as the
  original.
- **No notifications system.** The original broadcasts a Supabase
  notification on assignment/completion to logged-in admin sessions —
  meaningless without accounts. This build has no notification system at
  all; "everyone sees it" is satisfied by the board itself being shared
  and always showing current state on load/refresh.
- **No "Shared To-Do Cards" section** — that's a different, unrelated
  feature in the original app (per-role sharing grants) and was already
  hidden even there. Not part of this build at all.

If a future version needs real accounts, per-person attribution, or
push-style notifications, that's a deliberate follow-up — not something
missing by accident here.

**Time estimate**: ~20-30 minutes end to end (scaffold → Supabase → code →
push → deploy), assuming no unexpected errors.

---

## Prerequisites

- Node.js 18+ and npm installed
- A GitHub account (for the new repo)
- A Supabase account (free tier is fine) — supabase.com
- A Vercel account (free tier is fine) — vercel.com
- Your Bete Dokimas logo image file (used at `public/images/logo.jpg`)

---

## Step 1 — Scaffold the project

```bash
npx create-next-app@14 bete-dokimas-checklist --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint
cd bete-dokimas-checklist
```

When prompted, accept the defaults (App Router: yes, `src/` directory: yes,
import alias `@/*`: yes).

## Step 2 — Install dependencies

Only one extra package is needed — no auth helpers, since there's no login:

```bash
npm install @supabase/supabase-js
```

## Step 3 — Supabase project

1. Go to supabase.com/dashboard → New Project. Any name/region, set a DB
   password (you won't need it again after this).
2. Once it's ready, go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public key**
3. Go to **SQL Editor → New query**, paste the whole block below, and run
   it once:

```sql
create table if not exists public.checklist_tickets (
  id uuid primary key default gen_random_uuid(),
  tab text not null check (tab in ('yohannes', 'bersabeh', 'yakob', 'logistics')),
  title text not null,
  -- Free text, exactly as typed (e.g. "3:00", "14:30", "3:00 EAT") — no
  -- AM/PM or 24-hour parsing, no computed duration. Just two labels shown
  -- on the ticket.
  start_time text not null,
  end_time text not null,
  status text not null default 'open' check (status in ('open', 'done')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.checklist_tickets enable row level security;

-- No accounts/login in this build — every policy is deliberately open to
-- BOTH anon and authenticated. Anyone with the deployed app's URL can
-- read and write every ticket. This is acceptable only because this is a
-- short-lived internal tool for 3 known people acting in good faith, not
-- because it's a generally safe pattern to reuse elsewhere.
drop policy if exists "checklist_tickets_public_select" on public.checklist_tickets;
create policy "checklist_tickets_public_select"
  on public.checklist_tickets for select
  to anon, authenticated
  using (true);

drop policy if exists "checklist_tickets_public_insert" on public.checklist_tickets;
create policy "checklist_tickets_public_insert"
  on public.checklist_tickets for insert
  to anon, authenticated
  with check (true);

drop policy if exists "checklist_tickets_public_update" on public.checklist_tickets;
create policy "checklist_tickets_public_update"
  on public.checklist_tickets for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "checklist_tickets_public_delete" on public.checklist_tickets;
create policy "checklist_tickets_public_delete"
  on public.checklist_tickets for delete
  to anon, authenticated
  using (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_checklist_tickets_updated_at on public.checklist_tickets;
create trigger set_checklist_tickets_updated_at
  before update on public.checklist_tickets
  for each row
  execute function public.set_updated_at();
```

4. (Optional but recommended) Add 2-3 test rows so the board isn't empty
   on first load — either via the Table Editor UI, or:

```sql
insert into public.checklist_tickets (tab, title, start_time, end_time) values
  ('yohannes', 'Confirm venue walkthrough time', '9:00', '10:00'),
  ('bersabeh', 'Call the caterer about the final headcount', '2:00', '3:00'),
  ('logistics', 'Print seating chart', '11:00', '12:00');
```

## Step 4 — Environment variables

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

(No service role key needed anywhere in this build — every operation goes
through the anon key, matching the fully-open RLS policies above.)

## Step 5 — Logo

Copy your Bete Dokimas logo image to:

```
public/images/logo.jpg
```

(Any square-ish image works — it's displayed at 48px in a rounded tile.)

## Step 6 — Tailwind config

Replace `tailwind.config.ts` with:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        border: "var(--border)",
        "brand-white": "#FFFFFF",
        "brand-navy": {
          DEFAULT: "#20283B",
          50: "#f4f4f5",
          100: "#e9eaeb",
          200: "#c7c9ce",
          300: "#a6a9b1",
          400: "#636976",
          500: "#20283B",
          600: "#1b2232",
          700: "#161c29",
          800: "#121620",
          900: "#0d1018",
        },
        "brand-gold": {
          DEFAULT: "#C3B59B",
          50: "#fcfbfa",
          100: "#f9f8f5",
          200: "#f0ede6",
          300: "#e7e1d7",
          400: "#d5cbb9",
          500: "#C3B59B",
          600: "#a69a84",
          700: "#897f6d",
          800: "#6b6455",
          900: "#4e483e",
        },
        "brand-navy-tint": "#E7EAF2",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "sans-serif"],
      },
      boxShadow: {
        brand: "0 20px 40px -12px rgba(32, 40, 59, 0.25)",
        gold: "0 10px 24px -6px rgba(166, 154, 132, 0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
```

## Step 7 — Global styles

Replace `src/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #0d1018;
  --muted: #f4f4f5;
  --muted-foreground: #636976;
  --border: #e9eaeb;
}

body {
  color: var(--foreground);
  background: var(--background);
}
```

## Step 8 — Root layout (font + metadata)

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Bete Dokimas — Team Checklist",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

## Step 9 — Supabase client

Create `src/lib/supabaseClient.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

## Step 10 — Types

Create `src/types/checklistTicket.ts`:

```ts
export type ChecklistTicketTab = "yohannes" | "bersabeh" | "yakob" | "logistics";

export type ChecklistTicketStatus = "open" | "done";

export interface ChecklistTicket {
  id: string;
  tab: ChecklistTicketTab;
  title: string;
  start_time: string;
  end_time: string;
  status: ChecklistTicketStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
```

## Step 11 — Data access

Create `src/lib/checklistTickets.ts` (server-side fetch, used by the page):

```ts
import { supabase } from "@/lib/supabaseClient";
import type { ChecklistTicket } from "@/types/checklistTicket";

export async function getTickets(): Promise<ChecklistTicket[]> {
  const { data, error } = await supabase
    .from("checklist_tickets")
    .select("*")
    .order("status", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch checklist tickets: ${error.message}`);
  }

  return (data ?? []) as ChecklistTicket[];
}
```

Create `src/lib/checklistTicketsClient.ts` (browser-side mutations):

```ts
"use client";

import { supabase } from "@/lib/supabaseClient";
import type { ChecklistTicket, ChecklistTicketTab } from "@/types/checklistTicket";

export async function createTicket(
  tab: ChecklistTicketTab,
  title: string,
  startTime: string,
  endTime: string
): Promise<ChecklistTicket> {
  const { data, error } = await supabase
    .from("checklist_tickets")
    .insert({ tab, title, start_time: startTime, end_time: endTime })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create checklist ticket: ${error.message}`);
  }
  return data;
}

export async function setTicketStatus(
  ticketId: string,
  status: "open" | "done"
): Promise<ChecklistTicket> {
  const { data, error } = await supabase
    .from("checklist_tickets")
    .update(
      status === "done"
        ? { status, completed_at: new Date().toISOString() }
        : { status, completed_at: null }
    )
    .eq("id", ticketId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update checklist ticket: ${error.message}`);
  }
  return data;
}

export async function deleteTicket(ticketId: string): Promise<void> {
  const { error } = await supabase.from("checklist_tickets").delete().eq("id", ticketId);
  if (error) {
    throw new Error(`Failed to delete checklist ticket: ${error.message}`);
  }
}
```

## Step 12 — The ticket board component

Create `src/components/ChecklistTicketBoard.tsx` — this is the exact same
component (tabs, header banner with logo + progress bar, ticket rows,
collapsible Completed section) as the original, with only the
now-unnecessary `clientId` plumbing removed:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import {
  createTicket,
  deleteTicket,
  setTicketStatus,
} from "@/lib/checklistTicketsClient";
import type { ChecklistTicket, ChecklistTicketTab } from "@/types/checklistTicket";

const ASSIGNABLE_TABS: { key: ChecklistTicketTab; label: string }[] = [
  { key: "yohannes", label: "Yohannes" },
  { key: "bersabeh", label: "Bersabeh" },
  { key: "yakob", label: "Yakob" },
  { key: "logistics", label: "Logistics" },
];

type BoardTab = ChecklistTicketTab | "all";

const VIEW_TABS: { key: BoardTab; label: string }[] = [
  { key: "all", label: "All Tasks" },
  ...ASSIGNABLE_TABS,
];

const TAB_LABELS: Record<ChecklistTicketTab, string> = {
  yohannes: "Yohannes",
  bersabeh: "Bersabeh",
  yakob: "Yakob",
  logistics: "Logistics",
};

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0 1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function TicketRow({
  ticket,
  showAssignee,
  onToggle,
  onDelete,
}: {
  ticket: ChecklistTicket;
  showAssignee: boolean;
  onToggle: (ticket: ChecklistTicket) => void;
  onDelete: (ticket: ChecklistTicket) => void;
}) {
  const isDone = ticket.status === "done";

  return (
    <div className="group flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-brand-gold-50/60">
      <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={isDone}
          onChange={() => onToggle(ticket)}
          className="h-5 w-5 cursor-pointer accent-brand-gold-600"
        />
      </label>

      <span
        className={`min-w-0 flex-1 truncate text-sm font-medium ${
          isDone ? "text-muted-foreground line-through" : "text-foreground"
        }`}
      >
        {ticket.title}
      </span>

      {showAssignee && (
        <span className="inline-flex shrink-0 items-center rounded-full bg-brand-navy-tint px-2.5 py-1 text-xs font-bold text-brand-navy-700">
          {TAB_LABELS[ticket.tab]}
        </span>
      )}

      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
          isDone
            ? "bg-muted text-muted-foreground"
            : "bg-brand-gold-100 text-brand-gold-800"
        }`}
      >
        <ClockIcon />
        {ticket.start_time} &ndash; {ticket.end_time}
      </span>

      <button
        type="button"
        onClick={() => onDelete(ticket)}
        aria-label={`Delete "${ticket.title}"`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity duration-150 hover:text-red-600 group-hover:opacity-100"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

function BoardHeader({ doneCount, totalCount }: { doneCount: number; totalCount: number }) {
  const percent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-brand-navy-900 to-brand-navy-700 px-6 py-6 shadow-brand">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand-gold/10 blur-3xl"
      />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl shadow-lg ring-1 ring-brand-gold-500/40">
            <Image
              src="/images/logo.jpg"
              alt="Bete Dokimas"
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div>
            <p className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-400">
              Bete Dokimas
            </p>
            <h2 className="font-sans text-xl font-semibold text-brand-white">
              Team Checklist
            </h2>
          </div>
        </div>

        <div className="flex min-w-[12rem] flex-col items-end gap-1.5">
          <span className="text-sm font-bold text-brand-white">
            {percent}% Complete
          </span>
          <div className="h-2 w-48 max-w-full overflow-hidden rounded-full bg-brand-white/15">
            <div
              className="h-full rounded-full bg-brand-gold transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-xs text-brand-white/60">
            {doneCount}/{totalCount} tickets done
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ChecklistTicketBoard({
  initialTickets,
}: {
  initialTickets: ChecklistTicket[];
}) {
  const [tickets, setTickets] = useState<ChecklistTicket[]>(initialTickets);
  const [activeTab, setActiveTab] = useState<BoardTab>("yohannes");
  const [showCompleted, setShowCompleted] = useState(false);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [formTab, setFormTab] = useState<ChecklistTicketTab>("yohannes");
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const doneCount = tickets.filter((t) => t.status === "done").length;

  const countsByTab = VIEW_TABS.reduce<Record<BoardTab, number>>(
    (acc, tab) => {
      acc[tab.key] =
        tab.key === "all"
          ? tickets.filter((t) => t.status === "open").length
          : tickets.filter((t) => t.tab === tab.key && t.status === "open").length;
      return acc;
    },
    { all: 0, yohannes: 0, bersabeh: 0, yakob: 0, logistics: 0 }
  );

  const visibleTickets =
    activeTab === "all" ? tickets : tickets.filter((t) => t.tab === activeTab);
  const openTickets = visibleTickets.filter((t) => t.status === "open");
  const completedTickets = visibleTickets.filter((t) => t.status === "done");

  const handleSelectTab = (tab: BoardTab) => {
    setActiveTab(tab);
    if (tab !== "all") {
      setFormTab(tab);
    }
  };

  const handleToggle = async (ticket: ChecklistTicket) => {
    const nextStatus = ticket.status === "open" ? "done" : "open";
    const previous = tickets;
    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, status: nextStatus } : t))
    );
    try {
      await setTicketStatus(ticket.id, nextStatus);
    } catch (err) {
      setTickets(previous);
      window.alert(err instanceof Error ? err.message : "Failed to update ticket.");
    }
  };

  const handleDelete = async (ticket: ChecklistTicket) => {
    if (!window.confirm(`Delete "${ticket.title}"? This cannot be undone.`)) {
      return;
    }
    const previous = tickets;
    setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
    try {
      await deleteTicket(ticket.id);
    } catch (err) {
      setTickets(previous);
      window.alert(err instanceof Error ? err.message : "Failed to delete ticket.");
    }
  };

  const handleAddTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedStart = startTime.trim();
    const trimmedEnd = endTime.trim();

    if (!trimmedTitle) {
      setFormError("Title is required.");
      return;
    }
    if (!trimmedStart || !trimmedEnd) {
      setFormError("Enter a start and end time.");
      return;
    }

    setFormError(null);
    setIsAdding(true);
    try {
      const created = await createTicket(formTab, trimmedTitle, trimmedStart, trimmedEnd);
      setTickets((prev) => [...prev, created]);
      setTitle("");
      setStartTime("");
      setEndTime("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add ticket.");
    } finally {
      setIsAdding(false);
    }
  };

  const activeLabel = VIEW_TABS.find((t) => t.key === activeTab)?.label;

  return (
    <div className="flex flex-col gap-4">
      <BoardHeader doneCount={doneCount} totalCount={tickets.length} />

      <div className="flex flex-wrap gap-2">
        {VIEW_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleSelectTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all duration-150 ${
                isActive
                  ? "bg-brand-gold text-brand-navy-900 shadow-gold"
                  : "bg-brand-navy-tint text-brand-navy-700 hover:bg-brand-gold-100"
              }`}
            >
              {tab.label}
              {countsByTab[tab.key] > 0 && (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold ${
                    isActive
                      ? "bg-brand-navy-900 text-brand-gold-400"
                      : "bg-brand-navy-700 text-brand-white"
                  }`}
                >
                  {countsByTab[tab.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background shadow-brand">
        {openTickets.length === 0 && completedTickets.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No tickets in {activeLabel} yet.
          </p>
        ) : (
          <>
            {openTickets.length > 0 ? (
              <div className="divide-y divide-border">
                {openTickets.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    showAssignee={activeTab === "all"}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No open tickets in {activeLabel}.
              </p>
            )}

            {completedTickets.length > 0 && (
              <div className="border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCompleted((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-2 bg-muted/40 px-5 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground transition-colors duration-150 hover:bg-muted/70"
                >
                  <span>Completed &middot; {completedTickets.length}</span>
                  <ChevronDownIcon open={showCompleted} />
                </button>
                {showCompleted && (
                  <div className="divide-y divide-border">
                    {completedTickets.map((ticket) => (
                      <TicketRow
                        key={ticket.id}
                        ticket={ticket}
                        showAssignee={activeTab === "all"}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <form
          onSubmit={handleAddTicket}
          className="flex flex-col gap-2 border-t border-border bg-muted/40 p-4 sm:flex-row sm:items-center"
        >
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a ticket..."
            className="min-h-[44px] min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-gold-500"
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              placeholder="Start (EAT)"
              aria-label="Start time"
              className="min-h-[44px] w-full rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-gold-500 sm:w-28"
            />
            <span className="shrink-0 text-xs text-muted-foreground">to</span>
            <input
              type="text"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              placeholder="End (EAT)"
              aria-label="End time"
              className="min-h-[44px] w-full rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-gold-500 sm:w-28"
            />
          </div>
          <select
            value={formTab}
            onChange={(event) => setFormTab(event.target.value as ChecklistTicketTab)}
            className="min-h-[44px] w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-gold-500 sm:w-36"
          >
            {ASSIGNABLE_TABS.map((tab) => (
              <option key={tab.key} value={tab.key}>
                {tab.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isAdding}
            className="flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded bg-brand-gold px-5 text-sm font-bold text-brand-navy-900 shadow-gold transition-all duration-150 hover:bg-brand-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusIcon />
            {isAdding ? "Adding..." : "Add"}
          </button>
        </form>
        {formError && (
          <p className="border-t border-border bg-red-50 px-5 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}
      </div>
    </div>
  );
}
```

## Step 13 — The home page

Replace `src/app/page.tsx` with:

```tsx
import { getTickets } from "@/lib/checklistTickets";
import ChecklistTicketBoard from "@/components/ChecklistTicketBoard";

export default async function HomePage() {
  const tickets = await getTickets();

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <ChecklistTicketBoard initialTickets={tickets} />
      </div>
    </div>
  );
}
```

Delete anything else `create-next-app` generated in `src/app/` that you
don't need (e.g. the default `page.module.css` if present — this build
uses Tailwind only, no CSS modules).

## Step 14 — Run it locally

```bash
npm run dev
```

Open http://localhost:3000 — you should see the exact same board: header
with logo + percent-complete bar, the 5 tabs, ticket rows with start/end
time badges, the collapsible Completed section, and the add-ticket form.
Add a ticket, check it off, switch tabs, confirm everything matches.

## Step 15 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Team Checklist standalone build"
```

Create a new empty repo on GitHub (no README/gitignore — you already have
one from create-next-app), then:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

## Step 16 — Deploy to Vercel

1. Go to vercel.com/new, import the repo you just pushed.
2. Add the 2 environment variables from Step 4
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. Click Deploy.

That's it — you'll get a live URL immediately usable by all 3 of you, no
sign-in step, no client list, just the board.
