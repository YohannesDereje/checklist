import { getTickets } from "@/lib/checklistTickets";
import ChecklistTicketBoard from "@/components/ChecklistTicketBoard";

// Ticket state changes on every write (add/check/delete); without this the
// page gets statically prerendered once at build time and never reflects
// new data on reload.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const tickets = await getTickets();
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <ChecklistTicketBoard initialTickets={tickets} />
        </div>
      </div>
    );
  } catch (err) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
        <div className="max-w-lg rounded-lg border border-border bg-muted/40 p-6 text-center">
          <h1 className="text-lg font-bold text-foreground">Database not connected yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {err instanceof Error ? err.message : "Failed to load checklist tickets."}
          </p>
        </div>
      </div>
    );
  }
}
