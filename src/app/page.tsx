import { getTickets } from "@/lib/checklistTickets";
import ChecklistTicketBoard from "@/components/ChecklistTicketBoard";

// Ticket state changes on every write (add/check/delete); without this the
// page gets statically prerendered once at build time and never reflects
// new data on reload.
export const dynamic = "force-dynamic";

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
