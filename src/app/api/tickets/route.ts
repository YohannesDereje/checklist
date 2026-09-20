import { NextResponse } from "next/server";
import { createTicket, listTickets } from "@/lib/db";
import type { ChecklistTicketTab } from "@/types/checklistTicket";

const VALID_TABS: ChecklistTicketTab[] = ["yohannes", "bersabeh", "yakob", "logistics"];

export async function GET() {
  try {
    const tickets = await listTickets();
    return NextResponse.json(tickets);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch tickets." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tab = body?.tab;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const startTime = typeof body?.start_time === "string" ? body.start_time.trim() : "";
  const endTime = typeof body?.end_time === "string" ? body.end_time.trim() : "";

  if (!VALID_TABS.includes(tab)) {
    return NextResponse.json({ error: "Invalid or missing tab." }, { status: 400 });
  }
  if (!title || !startTime || !endTime) {
    return NextResponse.json(
      { error: "Title, start time, and end time are required." },
      { status: 400 }
    );
  }

  try {
    const ticket = await createTicket(tab, title, startTime, endTime);
    return NextResponse.json(ticket, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create ticket." },
      { status: 500 }
    );
  }
}
