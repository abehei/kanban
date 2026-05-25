import type { Task, Comment } from "../types";

const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "不明なエラー" }));
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const taskApi = {
  list: (params?: { column?: string; parent_id?: string }) => {
    const query = params
      ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null) as [string, string][]).toString()
      : "";
    return request<Task[]>(`/tasks${query}`);
  },

  get: (id: string) => request<Task>(`/tasks/${id}`),

  create: (body: Pick<Task, "title"> & Partial<Pick<Task, "description" | "column" | "assigned_agent" | "parent_id" | "color">>) =>
    request<Task>("/tasks", { method: "POST", body: JSON.stringify(body) }),

  update: (id: string, body: Partial<Pick<Task, "title" | "description" | "column" | "assigned_agent" | "progress" | "current_step" | "thinking_log" | "error" | "color">>) =>
    request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  delete: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),

  addSubtask: (parentId: string, body: Pick<Task, "title"> & Partial<Pick<Task, "description" | "assigned_agent">>) =>
    request<Task>(`/tasks/${parentId}/subtasks`, { method: "POST", body: JSON.stringify(body) }),

  updateSubtask: (parentId: string, subtaskId: string, body: Partial<Pick<Task, "title" | "description" | "column">>) =>
    request<Task>(`/tasks/${parentId}/subtasks/${subtaskId}`, { method: "PATCH", body: JSON.stringify(body) }),

  listComments: (taskId: string) => request<Comment[]>(`/tasks/${taskId}/comments`),

  addComment: (taskId: string, body: { author: string; author_type?: string; content: string; mentions?: string[] }) =>
    request<Comment>(`/tasks/${taskId}/comments`, { method: "POST", body: JSON.stringify(body) }),
};
