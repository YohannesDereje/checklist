import { listTickets } from "@/lib/db";
import type { ChecklistTicket } from "@/types/checklistTicket";

export async function getTickets(): Promise<ChecklistTicket[]> {
  return listTickets();
}
