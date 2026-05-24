export type ColumnId = "backlog" | "in-progress" | "waiting" | "review" | "done";

export type AuthorType = "human" | "agent";

export type AgentStatusType = "idle" | "running" | "error";

export interface Task {
  id: string;
  title: string;
  description: string;
  column: ColumnId;
  parent_id: string | null;
  assigned_agent: string | null;
  progress: number;
  current_step: string | null;
  thinking_log: string[];
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  author: string;
  author_type: AuthorType;
  content: string;
  mentions: string[];
  created_at: string;
}

export interface AgentStatus {
  agentId: string;
  status: AgentStatusType;
  step?: string;
}

export interface ColumnDefinition {
  id: ColumnId;
  label: string;
  color: string;
}

export const COLUMNS: ColumnDefinition[] = [
  { id: "backlog", label: "Backlog", color: "bg-slate-100" },
  { id: "in-progress", label: "In Progress", color: "bg-blue-50" },
  { id: "waiting", label: "Waiting", color: "bg-yellow-50" },
  { id: "review", label: "Review", color: "bg-purple-50" },
  { id: "done", label: "Done", color: "bg-green-50" },
];

// SSEで受け取るイベントの型
export type SSEEvent =
  | { type: "task:created"; data: Task }
  | { type: "task:updated"; data: Task }
  | { type: "task:deleted"; data: { id: string } }
  | { type: "comment:added"; data: Comment }
  | { type: "agent:status"; data: AgentStatus };
