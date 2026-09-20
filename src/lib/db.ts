import { Pool } from "pg";
import type {
  ChecklistTicket,
  ChecklistTicketStatus,
  ChecklistTicketTab,
} from "@/types/checklistTicket";
import * as localStore from "@/lib/localStore";

const connectionString = process.env.POSTGRES_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: connectionString.includes("sslmode=disable")
        ? false
        : { rejectUnauthorized: false },
    })
  : null;

// No POSTGRES_URL set yet (no Postgres database linked in Vercel/local .env.local):
// fall back to a JSON-file-backed store under .data/ so the app is fully usable
// for local development and preview before a real database exists. Once
// POSTGRES_URL is set, this switches to real Postgres with no code changes.
const usingPostgres = pool !== null;

// On Vercel the filesystem is read-only outside /tmp, so the local JSON
// fallback can't work there -- it would just crash. Fail with a clear,
// actionable message instead of a raw filesystem error.
const isVercel = Boolean(process.env.VERCEL);

function assertConfigured(): void {
  if (!usingPostgres && isVercel) {
    throw new Error(
      "No database is connected yet. In the Vercel dashboard, go to Storage -> Create Database -> Postgres, link it to this project, then run db/schema.sql once against it."
    );
  }
}

export async function listTickets(): Promise<ChecklistTicket[]> {
  assertConfigured();
  if (!usingPostgres) {
    return localStore.listTickets();
  }
  const { rows } = await pool.query<ChecklistTicket>(
    `select * from checklist_tickets order by position asc`
  );
  return rows;
}

export async function createTicket(
  tab: ChecklistTicketTab,
  title: string,
  startTime: string,
  endTime: string
): Promise<ChecklistTicket> {
  assertConfigured();
  if (!usingPostgres) {
    return localStore.createTicket(tab, title, startTime, endTime);
  }
  const { rows } = await pool.query<ChecklistTicket>(
    `insert into checklist_tickets (tab, title, start_time, end_time)
     values ($1, $2, $3, $4)
     returning *`,
    [tab, title, startTime, endTime]
  );
  return rows[0];
}

export async function updateTicketStatus(
  id: string,
  status: ChecklistTicketStatus
): Promise<ChecklistTicket> {
  assertConfigured();
  if (!usingPostgres) {
    return localStore.updateTicketStatus(id, status);
  }
  const completedAt = status === "done" ? new Date().toISOString() : null;
  const { rows } = await pool.query<ChecklistTicket>(
    `update checklist_tickets
     set status = $2, completed_at = $3
     where id = $1
     returning *`,
    [id, status, completedAt]
  );
  if (rows.length === 0) {
    throw new Error("Ticket not found.");
  }
  return rows[0];
}

export async function updateTicketPosition(
  id: string,
  position: number
): Promise<ChecklistTicket> {
  assertConfigured();
  if (!usingPostgres) {
    return localStore.updateTicketPosition(id, position);
  }
  const { rows } = await pool.query<ChecklistTicket>(
    `update checklist_tickets
     set position = $2
     where id = $1
     returning *`,
    [id, position]
  );
  if (rows.length === 0) {
    throw new Error("Ticket not found.");
  }
  return rows[0];
}

export async function deleteTicket(id: string): Promise<void> {
  assertConfigured();
  if (!usingPostgres) {
    return localStore.deleteTicket(id);
  }
  await pool.query(`delete from checklist_tickets where id = $1`, [id]);
}
