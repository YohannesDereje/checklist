"use client";

import type { ChecklistTicket, ChecklistTicketTab } from "@/types/checklistTicket";

async function parseResponse(response: Response, fallbackMessage: string) {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? fallbackMessage);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export async function fetchTickets(): Promise<ChecklistTicket[]> {
  const response = await fetch("/api/tickets", { cache: "no-store" });
  return parseResponse(response, "Failed to load checklist tickets.");
}

export async function createTicket(
  tab: ChecklistTicketTab,
  title: string,
  startTime: string,
  endTime: string
): Promise<ChecklistTicket> {
  const response = await fetch("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tab, title, start_time: startTime, end_time: endTime }),
  });
  return parseResponse(response, "Failed to create checklist ticket.");
}

export async function setTicketStatus(
  ticketId: string,
  status: "open" | "done"
): Promise<ChecklistTicket> {
  const response = await fetch(`/api/tickets/${ticketId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return parseResponse(response, "Failed to update checklist ticket.");
}

export async function setTicketPosition(
  ticketId: string,
  position: number
): Promise<ChecklistTicket> {
  const response = await fetch(`/api/tickets/${ticketId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ position }),
  });
  return parseResponse(response, "Failed to reorder checklist ticket.");
}

export async function deleteTicket(ticketId: string): Promise<void> {
  const response = await fetch(`/api/tickets/${ticketId}`, { method: "DELETE" });
  await parseResponse(response, "Failed to delete checklist ticket.");
}
