import type { Task, Comment } from "../../types";

export function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "mock-task-id",
    title: "モックタスク",
    description: "",
    column: "backlog",
    parent_id: null,
    assigned_agent: null,
    progress: 0,
    current_step: null,
    thinking_log: [],
    error: null,
    color: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function createMockComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "mock-comment-id",
    task_id: "mock-task-id",
    author: "テストユーザー",
    author_type: "human",
    content: "テストコメント",
    mentions: [],
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
