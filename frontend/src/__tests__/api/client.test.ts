import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { taskApi } from "../../api/client";
import { createMockTask, createMockComment } from "../fixtures/mockData";

const mockTask = createMockTask();
const mockTask2 = createMockTask({ id: "task-2", title: "別のタスク" });

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.clearAllMocks();
});

function mockFetchResponse(data: unknown, status = 200) {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response);
}

describe("taskApi.list", () => {
  it("GETリクエストを送信してタスク一覧を返す", async () => {
    mockFetchResponse([mockTask, mockTask2]);
    const result = await taskApi.list();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/tasks"), expect.any(Object));
    expect(result).toEqual([mockTask, mockTask2]);
    expect(result).toHaveLength(2);
  });

  it("columnパラメータでフィルタリングできる", async () => {
    mockFetchResponse([mockTask]);
    await taskApi.list({ column: "in-progress" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/tasks?column=in-progress"),
      expect.any(Object)
    );
  });

  it("parent_idパラメータでフィルタリングできる", async () => {
    mockFetchResponse([mockTask]);
    await taskApi.list({ parent_id: "parent-123" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/tasks?parent_id=parent-123"),
      expect.any(Object)
    );
  });

  it("複数パラメータでフィルタリングできる", async () => {
    mockFetchResponse([mockTask]);
    await taskApi.list({ column: "backlog", parent_id: "parent-123" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/tasks?"),
      expect.any(Object)
    );
    const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(callUrl).toContain("column=backlog");
    expect(callUrl).toContain("parent_id=parent-123");
  });
});

describe("taskApi.get", () => {
  it("指定されたタスクを取得する", async () => {
    mockFetchResponse(mockTask);
    const result = await taskApi.get(mockTask.id);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/tasks/${mockTask.id}`),
      expect.any(Object)
    );
    expect(result).toEqual(mockTask);
  });
});

describe("taskApi.create", () => {
  it("POSTリクエストでタスクを作成する", async () => {
    mockFetchResponse(mockTask);
    const result = await taskApi.create({ title: "新タスク" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/tasks"),
      expect.objectContaining({ method: "POST" })
    );
    expect(result).toEqual(mockTask);
  });

  it("descriptionを含める場合", async () => {
    const createdTask = createMockTask({ description: "説明文" });
    mockFetchResponse(createdTask);
    const result = await taskApi.create({ title: "新タスク", description: "説明文" });
    expect(result.description).toBe("説明文");
  });

  it("columnを指定できる", async () => {
    const createdTask = createMockTask({ column: "in-progress" });
    mockFetchResponse(createdTask);
    const result = await taskApi.create({ title: "新タスク", column: "in-progress" });
    expect(result.column).toBe("in-progress");
  });
});

describe("taskApi.update", () => {
  it("PATCHリクエストでタスクを更新する", async () => {
    const updated = { ...mockTask, title: "更新後" };
    mockFetchResponse(updated);
    const result = await taskApi.update(mockTask.id, { title: "更新後" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/tasks/${mockTask.id}`),
      expect.objectContaining({ method: "PATCH" })
    );
    expect(result.title).toBe("更新後");
  });

  it("columnを更新できる", async () => {
    const updated = { ...mockTask, column: "done" as const };
    mockFetchResponse(updated);
    const result = await taskApi.update(mockTask.id, { column: "done" });
    expect(result.column).toBe("done");
  });

  it("progressを更新できる", async () => {
    const updated = { ...mockTask, progress: 50 };
    mockFetchResponse(updated);
    const result = await taskApi.update(mockTask.id, { progress: 50 });
    expect(result.progress).toBe(50);
  });

  it("複数フィールドを一度に更新できる", async () => {
    const updated = {
      ...mockTask,
      title: "更新",
      column: "in-progress" as const,
      progress: 30,
    };
    mockFetchResponse(updated);
    const result = await taskApi.update(mockTask.id, {
      title: "更新",
      column: "in-progress",
      progress: 30,
    });
    expect(result.title).toBe("更新");
    expect(result.column).toBe("in-progress");
    expect(result.progress).toBe(30);
  });
});

describe("taskApi.delete", () => {
  it("DELETEリクエストでタスクを削除する", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => undefined,
    } as Response);
    await taskApi.delete(mockTask.id);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/tasks/${mockTask.id}`),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("削除成功時は戻り値がvoid", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => undefined,
    } as Response);
    const result = await taskApi.delete(mockTask.id);
    expect(result).toBeUndefined();
  });
});

describe("taskApi.addSubtask", () => {
  it("親タスクにサブタスクを追加できる", async () => {
    const subtask = createMockTask({ id: "subtask-1", parent_id: mockTask.id });
    mockFetchResponse(subtask);
    const result = await taskApi.addSubtask(mockTask.id, { title: "サブタスク" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/tasks/${mockTask.id}/subtasks`),
      expect.objectContaining({ method: "POST" })
    );
    expect(result).toEqual(subtask);
  });
});

describe("taskApi.updateSubtask", () => {
  it("サブタスクを更新できる", async () => {
    const updated = createMockTask({
      id: "subtask-1",
      parent_id: mockTask.id,
      column: "done",
    });
    mockFetchResponse(updated);
    const result = await taskApi.updateSubtask(mockTask.id, "subtask-1", { column: "done" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/tasks/${mockTask.id}/subtasks/subtask-1`),
      expect.objectContaining({ method: "PATCH" })
    );
    expect(result.column).toBe("done");
  });
});

describe("taskApi.listComments", () => {
  it("タスクのコメント一覧を取得できる", async () => {
    const mockComment = createMockComment();
    mockFetchResponse([mockComment]);
    const result = await taskApi.listComments(mockTask.id);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/tasks/${mockTask.id}/comments`),
      expect.any(Object)
    );
    expect(result).toEqual([mockComment]);
  });
});

describe("taskApi.addComment", () => {
  it("タスクにコメントを追加できる", async () => {
    const mockComment = createMockComment();
    mockFetchResponse(mockComment);
    const result = await taskApi.addComment(mockTask.id, {
      author: "テストユーザー",
      content: "テストコメント",
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/tasks/${mockTask.id}/comments`),
      expect.objectContaining({ method: "POST" })
    );
    expect(result).toEqual(mockComment);
  });

  it("author_typeを指定できる", async () => {
    const mockComment = createMockComment({ author_type: "agent" });
    mockFetchResponse(mockComment);
    const result = await taskApi.addComment(mockTask.id, {
      author: "Agent",
      author_type: "agent",
      content: "エージェントのコメント",
    });
    expect(result.author_type).toBe("agent");
  });

  it("mentionsを含められる", async () => {
    const mockComment = createMockComment({ mentions: ["@user1", "@user2"] });
    mockFetchResponse(mockComment);
    const result = await taskApi.addComment(mockTask.id, {
      author: "テストユーザー",
      content: "コメント @user1 @user2",
      mentions: ["@user1", "@user2"],
    });
    expect(result.mentions).toEqual(["@user1", "@user2"]);
  });
});

describe("エラーハンドリング", () => {
  it("HTTPエラーレスポンスの場合、エラーメッセージをスロー", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "タスクが見つかりません" }),
    } as Response);
    await expect(taskApi.get("non-existent")).rejects.toThrow("タスクが見つかりません");
  });

  it("JSONパースに失敗した場合、デフォルトエラーメッセージをスロー", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("JSON parse error");
      },
    } as Response);
    await expect(taskApi.list()).rejects.toThrow("不明なエラー");
  });

  it("networkエラーをスロー", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));
    await expect(taskApi.list()).rejects.toThrow("Network error");
  });
});
