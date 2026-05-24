// バックエンドAPIを叩くためのHTTPクライアント
// エージェントのツール実装から呼び出す

const API_BASE = process.env.KANBAN_API_URL ?? "http://localhost:3001";

type Task = {
  id: string;
  title: string;
  description: string;
  column: string;
  parent_id: string | null;
  assigned_agent: string | null;
  progress: number;
  current_step: string | null;
  thinking_log: string[];
  error: string | null;
  created_at: string;
  updated_at: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API エラー ${response.status}: ${body}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const kanbanApi = {
  listTasks: (column?: string): Promise<Task[]> => {
    const query = column ? `?column=${column}` : "";
    return request<Task[]>(`/api/tasks${query}`);
  },

  createTask: (params: {
    title: string;
    description?: string;
    column?: string;
    assigned_agent?: string;
    parent_id?: string;
  }): Promise<Task> =>
    request<Task>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  updateTask: (
    id: string,
    params: Partial<{
      title: string;
      column: string;
      assigned_agent: string;
      progress: number;
      current_step: string;
      thinking_log: string[];
      error: string;
    }>
  ): Promise<Task> =>
    request<Task>(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(params),
    }),

  addSubtask: (
    parentId: string,
    params: { title: string; description?: string; assigned_agent?: string }
  ): Promise<Task> =>
    request<Task>(`/api/tasks/${parentId}/subtasks`, {
      method: "POST",
      body: JSON.stringify(params),
    }),

  postComment: (
    taskId: string,
    params: { author: string; content: string; author_type?: string }
  ): Promise<void> =>
    request<void>(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      body: JSON.stringify({ author_type: "agent", ...params }),
    }),

  broadcastAgentStatus: (agentId: string, status: string, step?: string): Promise<void> =>
    request<void>("/api/events/agent-status", {
      method: "POST",
      body: JSON.stringify({ agentId, status, step }),
    }),
};
