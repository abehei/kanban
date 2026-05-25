export function createMockTask(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: "test-task-id",
    title: "テストタスク",
    description: "",
    column: "backlog" as const,
    parent_id: null,
    assigned_agent: null,
    progress: 0,
    current_step: null,
    thinking_log: "[]",
    error: null,
    color: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function createMockComment(taskId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "test-comment-id",
    task_id: taskId,
    author: "テストユーザー",
    author_type: "human",
    content: "テストコメント",
    mentions: "[]",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
