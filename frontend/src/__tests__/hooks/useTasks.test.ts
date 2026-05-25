import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useTasks } from "../../hooks/useTasks";
import { createMockTask } from "../fixtures/mockData";

const mockTask = createMockTask({ id: "task-1" });
const mockTask2 = createMockTask({ id: "task-2" });

// hooks以下をすべてmocker化
vi.mock("../../hooks/useSSE");
vi.mock("../../api/client");

import { taskApi } from "../../api/client";
import { useSSE } from "../../hooks/useSSE";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useTasks", () => {
  it("初期状態ではisLoadingがtrueで、tasksが空", async () => {
    vi.mocked(taskApi.list).mockResolvedValueOnce([]);
    vi.mocked(useSSE).mockImplementation(() => {});

    const { result } = renderHook(() => useTasks());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.tasks).toEqual([]);
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("マウント時にタスク一覧を取得する", async () => {
    vi.mocked(taskApi.list).mockResolvedValueOnce([mockTask, mockTask2]);
    vi.mocked(useSSE).mockImplementation(() => {});

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tasks).toHaveLength(2);
    expect(result.current.tasks[0]).toEqual(mockTask);
    expect(result.current.tasks[1]).toEqual(mockTask2);
  });

  it("タスク取得時にエラーが発生した場合、errorに設定される", async () => {
    const error = new Error("API エラー");
    vi.mocked(taskApi.list).mockRejectedValueOnce(error);
    vi.mocked(useSSE).mockImplementation(() => {});

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toContain("API エラー");
  });

  it("moveTaskでタスクのカラムを更新", async () => {
    const updated = createMockTask({ id: "task-1", column: "done" });
    vi.mocked(taskApi.list).mockResolvedValueOnce([mockTask]);
    vi.mocked(taskApi.update).mockResolvedValueOnce(updated);
    vi.mocked(useSSE).mockImplementation(() => {});

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.moveTask("task-1", "done");
    });

    expect(taskApi.update).toHaveBeenCalledWith("task-1", { column: "done" });
    expect(result.current.tasks[0].column).toBe("done");
  });

  it("moveTask失敗時はerrorに設定", async () => {
    const error = new Error("更新失敗");
    vi.mocked(taskApi.list).mockResolvedValueOnce([mockTask]);
    vi.mocked(taskApi.update).mockRejectedValueOnce(error);
    vi.mocked(useSSE).mockImplementation(() => {});

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.moveTask("task-1", "done");
    });

    expect(result.current.error).toContain("更新失敗");
  });

  it("createTaskで新タスクを作成", async () => {
    const newTask = createMockTask({ id: "task-new", title: "新タスク" });
    vi.mocked(taskApi.list).mockResolvedValueOnce([mockTask]);
    vi.mocked(taskApi.create).mockResolvedValueOnce(newTask);
    vi.mocked(useSSE).mockImplementation(() => {});

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createTask("新タスク");
    });

    expect(taskApi.create).toHaveBeenCalledWith({
      title: "新タスク",
      description: undefined,
      column: "backlog",
    });
    expect(result.current.tasks).toContainEqual(newTask);
  });

  it("createTaskで説明付きタスクを作成", async () => {
    const newTask = createMockTask({ id: "task-new", title: "新タスク", description: "説明" });
    vi.mocked(taskApi.list).mockResolvedValueOnce([mockTask]);
    vi.mocked(taskApi.create).mockResolvedValueOnce(newTask);
    vi.mocked(useSSE).mockImplementation(() => {});

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createTask("新タスク", "説明");
    });

    expect(taskApi.create).toHaveBeenCalledWith({
      title: "新タスク",
      description: "説明",
      column: "backlog",
    });
  });

  it("createTask失敗時はerrorに設定", async () => {
    const error = new Error("作成失敗");
    vi.mocked(taskApi.list).mockResolvedValueOnce([mockTask]);
    vi.mocked(taskApi.create).mockRejectedValueOnce(error);
    vi.mocked(useSSE).mockImplementation(() => {});

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createTask("新タスク");
    });

    expect(result.current.error).toContain("作成失敗");
  });

  it("deleteTaskでタスクを削除", async () => {
    vi.mocked(taskApi.list).mockResolvedValueOnce([mockTask]);
    vi.mocked(taskApi.delete).mockResolvedValueOnce(undefined);
    vi.mocked(useSSE).mockImplementation(() => {});

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteTask("task-1");
    });

    expect(taskApi.delete).toHaveBeenCalledWith("task-1");
  });

  it("deleteTask失敗時はerrorに設定", async () => {
    const error = new Error("削除失敗");
    vi.mocked(taskApi.list).mockResolvedValueOnce([mockTask]);
    vi.mocked(taskApi.delete).mockRejectedValueOnce(error);
    vi.mocked(useSSE).mockImplementation(() => {});

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteTask("task-1");
    });

    expect(result.current.error).toContain("削除失敗");
  });

  it("SSEイベント(task:created)でタスク追加", async () => {
    let capturedHandler: any;
    vi.mocked(taskApi.list).mockResolvedValueOnce([mockTask]);
    vi.mocked(useSSE).mockImplementation((handler) => {
      capturedHandler = handler;
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newTask = createMockTask({ id: "task-3", title: "新タスク" });

    act(() => {
      capturedHandler({ type: "task:created", data: newTask });
    });

    expect(result.current.tasks).toContainEqual(newTask);
    expect(result.current.tasks).toHaveLength(2);
  });

  it("SSEイベント(task:updated)でタスク更新", async () => {
    let capturedHandler: any;
    vi.mocked(taskApi.list).mockResolvedValueOnce([mockTask]);
    vi.mocked(useSSE).mockImplementation((handler) => {
      capturedHandler = handler;
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updatedTask = createMockTask({ id: "task-1", title: "更新されたタスク" });

    act(() => {
      capturedHandler({ type: "task:updated", data: updatedTask });
    });

    expect(result.current.tasks[0]).toEqual(updatedTask);
    expect(result.current.tasks[0].title).toBe("更新されたタスク");
  });

  it("SSEイベント(task:deleted)でタスク削除", async () => {
    let capturedHandler: any;
    vi.mocked(taskApi.list).mockResolvedValueOnce([mockTask, mockTask2]);
    vi.mocked(useSSE).mockImplementation((handler) => {
      capturedHandler = handler;
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tasks).toHaveLength(2);

    act(() => {
      capturedHandler({ type: "task:deleted", data: { id: "task-1" } });
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe("task-2");
  });

  it("SSEイベント(agent:status)でエージェント状態を更新", async () => {
    let capturedHandler: any;
    vi.mocked(taskApi.list).mockResolvedValueOnce([mockTask]);
    vi.mocked(useSSE).mockImplementation((handler) => {
      capturedHandler = handler;
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.agentStatuses.size).toBe(0);

    act(() => {
      capturedHandler({
        type: "agent:status",
        data: { agentId: "agent-1", status: "running" },
      });
    });

    expect(result.current.agentStatuses.size).toBe(1);
    expect(result.current.agentStatuses.get("agent-1")).toEqual({
      agentId: "agent-1",
      status: "running",
    });
  });

  it("agentStatusesはMapで複数のエージェント状態を管理", async () => {
    let capturedHandler: any;
    vi.mocked(taskApi.list).mockResolvedValueOnce([mockTask]);
    vi.mocked(useSSE).mockImplementation((handler) => {
      capturedHandler = handler;
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      capturedHandler({
        type: "agent:status",
        data: { agentId: "agent-1", status: "running" },
      });
      capturedHandler({
        type: "agent:status",
        data: { agentId: "agent-2", status: "idle" },
      });
    });

    expect(result.current.agentStatuses.size).toBe(2);
    expect(result.current.agentStatuses.get("agent-1")?.status).toBe("running");
    expect(result.current.agentStatuses.get("agent-2")?.status).toBe("idle");
  });
});
