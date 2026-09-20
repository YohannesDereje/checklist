"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type HTMLAttributes } from "react";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createTicket,
  deleteTicket,
  fetchTickets,
  setTicketPosition,
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

// How long a just-checked ticket stays visible (checked + struck through) in
// the open list before it actually moves into the collapsed Completed
// section. Without this it vanishes the instant you check it, which reads
// as "nothing happened" rather than "it got checked".
const COMPLETE_TRANSITION_MS = 550;

// How often to pull the latest board state from the server so everyone
// sees everyone else's changes without a manual refresh.
const POLL_INTERVAL_MS = 4000;

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

function GripIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <circle cx="7" cy="4" r="1.4" />
      <circle cx="13" cy="4" r="1.4" />
      <circle cx="7" cy="10" r="1.4" />
      <circle cx="13" cy="10" r="1.4" />
      <circle cx="7" cy="16" r="1.4" />
      <circle cx="13" cy="16" r="1.4" />
    </svg>
  );
}

function TicketRow({
  ticket,
  showAssignee,
  onToggle,
  onDelete,
  dragHandleProps,
}: {
  ticket: ChecklistTicket;
  showAssignee: boolean;
  onToggle: (ticket: ChecklistTicket) => void;
  onDelete: (ticket: ChecklistTicket) => void;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
}) {
  const isDone = ticket.status === "done";

  return (
    <div className="group flex items-center gap-2 px-2 py-3 pr-4 transition-colors duration-150 hover:bg-brand-gold-50/60">
      {dragHandleProps ? (
        <button
          type="button"
          {...dragHandleProps}
          aria-label={`Reorder "${ticket.title}"`}
          className="flex h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-brand-navy-300 opacity-0 transition-opacity duration-150 hover:text-brand-navy-500 group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripIcon />
        </button>
      ) : (
        <div aria-hidden="true" className="h-9 w-6 shrink-0" />
      )}

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

function SortableTicketRow({
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-background">
      <TicketRow
        ticket={ticket}
        showAssignee={showAssignee}
        onToggle={onToggle}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
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
              src="/images/logo.png"
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
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);

  // dnd-kit assigns each draggable an auto-generated a11y id that isn't
  // guaranteed to match between the server-rendered HTML and the first
  // client render, which trips a hydration mismatch. Render the plain
  // (non-draggable) rows for the very first client render, then swap in
  // drag-and-drop once mounted -- that swap is an ordinary client update,
  // not part of hydration, so it can't mismatch.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Tracks in-flight local writes so a poll landing mid-mutation can't
  // clobber an optimistic update with stale pre-mutation server data.
  const pendingMutations = useRef(0);
  // Paused while a drag is in progress so the list doesn't jump under the
  // user's cursor mid-drag.
  const isDraggingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      if (pendingMutations.current > 0 || isDraggingRef.current) {
        return;
      }
      try {
        const latest = await fetchTickets();
        if (!cancelled && pendingMutations.current === 0 && !isDraggingRef.current) {
          setTickets(latest);
        }
      } catch {
        // Transient network hiccup -- keep showing the last known state and
        // let the next poll retry.
      }
    };

    const intervalId = window.setInterval(poll, POLL_INTERVAL_MS);
    const handleBecameVisible = () => {
      if (document.visibilityState === "visible") {
        poll();
      }
    };
    window.addEventListener("focus", handleBecameVisible);
    document.addEventListener("visibilitychange", handleBecameVisible);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleBecameVisible);
      document.removeEventListener("visibilitychange", handleBecameVisible);
    };
  }, []);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [formTab, setFormTab] = useState<ChecklistTicketTab>("yohannes");
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const visibleTickets = (
    activeTab === "all" ? tickets : tickets.filter((t) => t.tab === activeTab)
  )
    .slice()
    .sort((a, b) => a.position - b.position);

  // A ticket that was just checked stays in the open list (still checked,
  // still struck through) for COMPLETE_TRANSITION_MS before it actually
  // drops into the collapsed Completed section below.
  const openTickets = visibleTickets.filter(
    (t) => t.status === "open" || t.id === justCompletedId
  );
  const completedTickets = visibleTickets.filter(
    (t) => t.status === "done" && t.id !== justCompletedId
  );

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

    if (nextStatus === "done") {
      setJustCompletedId(ticket.id);
      window.setTimeout(() => {
        setJustCompletedId((current) => (current === ticket.id ? null : current));
      }, COMPLETE_TRANSITION_MS);
    } else if (justCompletedId === ticket.id) {
      setJustCompletedId(null);
    }

    pendingMutations.current += 1;
    try {
      await setTicketStatus(ticket.id, nextStatus);
    } catch (err) {
      setTickets(previous);
      setJustCompletedId((current) => (current === ticket.id ? null : current));
      window.alert(err instanceof Error ? err.message : "Failed to update ticket.");
    } finally {
      pendingMutations.current -= 1;
    }
  };

  const handleDelete = async (ticket: ChecklistTicket) => {
    if (!window.confirm(`Delete "${ticket.title}"? This cannot be undone.`)) {
      return;
    }
    const previous = tickets;
    setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
    pendingMutations.current += 1;
    try {
      await deleteTicket(ticket.id);
    } catch (err) {
      setTickets(previous);
      window.alert(err instanceof Error ? err.message : "Failed to delete ticket.");
    } finally {
      pendingMutations.current -= 1;
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
    pendingMutations.current += 1;
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
      pendingMutations.current -= 1;
    }
  };

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      isDraggingRef.current = false;
      return;
    }

    const oldIndex = openTickets.findIndex((t) => t.id === active.id);
    const newIndex = openTickets.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      isDraggingRef.current = false;
      return;
    }

    const reordered = arrayMove(openTickets, oldIndex, newIndex);
    const before = reordered[newIndex - 1];
    const after = reordered[newIndex + 1];
    const movedId = String(active.id);

    let newPosition: number;
    if (before && after) {
      newPosition = (before.position + after.position) / 2;
    } else if (before) {
      newPosition = before.position + 1000;
    } else if (after) {
      newPosition = after.position - 1000;
    } else {
      newPosition = Date.now();
    }

    const previous = tickets;
    setTickets((prev) =>
      prev.map((t) => (t.id === movedId ? { ...t, position: newPosition } : t))
    );

    pendingMutations.current += 1;
    try {
      await setTicketPosition(movedId, newPosition);
    } catch (err) {
      setTickets(previous);
      window.alert(err instanceof Error ? err.message : "Failed to reorder ticket.");
    } finally {
      pendingMutations.current -= 1;
      isDraggingRef.current = false;
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
              isMounted ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={openTickets.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="divide-y divide-border">
                      {openTickets.map((ticket) => (
                        <SortableTicketRow
                          key={ticket.id}
                          ticket={ticket}
                          showAssignee={activeTab === "all"}
                          onToggle={handleToggle}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
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
              )
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
