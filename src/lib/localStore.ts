import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type {
  ChecklistTicket,
  ChecklistTicketStatus,
  ChecklistTicketTab,
} from "@/types/checklistTicket";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "tickets.json");

function seedTickets(): ChecklistTicket[] {
  const now = new Date().toISOString();
  return [
    {
      id: randomUUID(),
      tab: "yohannes",
      title: "Confirm venue walkthrough time",
      start_time: "9:00",
      end_time: "10:00",
      status: "open",
      completed_at: null,
      created_at: now,
      updated_at: now,
      position: 1000,
    },
    {
      id: randomUUID(),
      tab: "bersabeh",
      title: "Call the caterer about the final headcount",
      start_time: "2:00",
      end_time: "3:00",
      status: "open",
      completed_at: null,
      created_at: now,
      updated_at: now,
      position: 2000,
    },
    {
      id: randomUUID(),
      tab: "logistics",
      title: "Print seating chart",
      start_time: "11:00",
      end_time: "12:00",
      status: "open",
      completed_at: null,
      created_at: now,
      updated_at: now,
      position: 3000,
    },
  ];
}

async function readAll(): Promise<ChecklistTicket[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as ChecklistTicket[];
  } catch {
    const seed = seedTickets();
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(seed, null, 2));
    return seed;
  }
}

async function writeAll(tickets: ChecklistTicket[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(tickets, null, 2));
}

function sortTickets(tickets: ChecklistTicket[]): ChecklistTicket[] {
  return [...tickets].sort((a, b) => a.position - b.position);
}

export async function listTickets(): Promise<ChecklistTicket[]> {
  return sortTickets(await readAll());
}

export async function createTicket(
  tab: ChecklistTicketTab,
  title: string,
  startTime: string,
  endTime: string
): Promise<ChecklistTicket> {
  const tickets = await readAll();
  const now = new Date().toISOString();
  const ticket: ChecklistTicket = {
    id: randomUUID(),
    tab,
    title,
    start_time: startTime,
    end_time: endTime,
    status: "open",
    completed_at: null,
    created_at: now,
    updated_at: now,
    position: Date.now(),
  };
  tickets.push(ticket);
  await writeAll(tickets);
  return ticket;
}

export async function updateTicketStatus(
  id: string,
  status: ChecklistTicketStatus
): Promise<ChecklistTicket> {
  const tickets = await readAll();
  const index = tickets.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error("Ticket not found.");
  }
  const updated: ChecklistTicket = {
    ...tickets[index],
    status,
    completed_at: status === "done" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  tickets[index] = updated;
  await writeAll(tickets);
  return updated;
}

export async function updateTicketPosition(
  id: string,
  position: number
): Promise<ChecklistTicket> {
  const tickets = await readAll();
  const index = tickets.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error("Ticket not found.");
  }
  const updated: ChecklistTicket = {
    ...tickets[index],
    position,
    updated_at: new Date().toISOString(),
  };
  tickets[index] = updated;
  await writeAll(tickets);
  return updated;
}

export async function deleteTicket(id: string): Promise<void> {
  const tickets = await readAll();
  await writeAll(tickets.filter((t) => t.id !== id));
}
