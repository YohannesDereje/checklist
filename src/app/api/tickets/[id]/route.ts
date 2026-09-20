import { NextResponse } from "next/server";
import { deleteTicket, updateTicketPosition, updateTicketStatus } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);

  try {
    if (typeof body?.position === "number" && Number.isFinite(body.position)) {
      const ticket = await updateTicketPosition(params.id, body.position);
      return NextResponse.json(ticket);
    }

    if (body?.status === "open" || body?.status === "done") {
      const ticket = await updateTicketStatus(params.id, body.status);
      return NextResponse.json(ticket);
    }

    return NextResponse.json(
      { error: "Provide a valid 'status' ('open' or 'done') or a numeric 'position'." },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update ticket." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await deleteTicket(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete ticket." },
      { status: 500 }
    );
  }
}
