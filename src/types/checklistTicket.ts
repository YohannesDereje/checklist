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
  position: number;
}
