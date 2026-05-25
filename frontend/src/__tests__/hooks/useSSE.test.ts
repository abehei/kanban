import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSSE } from "../../hooks/useSSE";

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  listeners: Record<string, EventListenerOrEventListenerObject[]> = {};

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }
  }

  close = vi.fn();

  emit(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) });
    const listeners = this.listeners[type] ?? [];
    listeners.forEach((l) => {
      if (typeof l === "function") l(event);
      else l.handleEvent(event);
    });
  }
}

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useSSE", () => {
  it("マウント時にEventSourceに接続する", () => {
    const onEvent = vi.fn();
    renderHook(() => useSSE(onEvent));
    expect(MockEventSource.instances.length).toBe(1);
    expect(MockEventSource.instances[0].url).toContain("/api/events");
  });

  it("アンマウント時にEventSourceをcloseする", () => {
    const onEvent = vi.fn();
    const { unmount } = renderHook(() => useSSE(onEvent));
    unmount();
    expect(MockEventSource.instances[0].close).toHaveBeenCalled();
  });

  it("task:createdイベントを受け取る", () => {
    const onEvent = vi.fn();
    renderHook(() => useSSE(onEvent));

    const eventSource = MockEventSource.instances[0];
    const taskData = { id: "task-1", title: "新タスク" };
    eventSource.emit("task:created", taskData);

    expect(onEvent).toHaveBeenCalledWith({
      type: "task:created",
      data: taskData,
    });
  });

  it("task:updatedイベントを受け取る", () => {
    const onEvent = vi.fn();
    renderHook(() => useSSE(onEvent));

    const eventSource = MockEventSource.instances[0];
    const taskData = { id: "task-1", title: "更新後" };
    eventSource.emit("task:updated", taskData);

    expect(onEvent).toHaveBeenCalledWith({
      type: "task:updated",
      data: taskData,
    });
  });

  it("task:deletedイベントを受け取る", () => {
    const onEvent = vi.fn();
    renderHook(() => useSSE(onEvent));

    const eventSource = MockEventSource.instances[0];
    eventSource.emit("task:deleted", { id: "task-1" });

    expect(onEvent).toHaveBeenCalledWith({
      type: "task:deleted",
      data: { id: "task-1" },
    });
  });

  it("comment:addedイベントを受け取る", () => {
    const onEvent = vi.fn();
    renderHook(() => useSSE(onEvent));

    const eventSource = MockEventSource.instances[0];
    const commentData = { id: "comment-1", content: "コメント" };
    eventSource.emit("comment:added", commentData);

    expect(onEvent).toHaveBeenCalledWith({
      type: "comment:added",
      data: commentData,
    });
  });

  it("agent:statusイベントを受け取る", () => {
    const onEvent = vi.fn();
    renderHook(() => useSSE(onEvent));

    const eventSource = MockEventSource.instances[0];
    const statusData = { agentId: "agent-1", status: "running" as const };
    eventSource.emit("agent:status", statusData);

    expect(onEvent).toHaveBeenCalledWith({
      type: "agent:status",
      data: statusData,
    });
  });

  it("複数のイベントを順次受け取る", () => {
    const onEvent = vi.fn();
    renderHook(() => useSSE(onEvent));

    const eventSource = MockEventSource.instances[0];
    eventSource.emit("task:created", { id: "task-1" });
    eventSource.emit("task:updated", { id: "task-1" });
    eventSource.emit("task:deleted", { id: "task-1" });

    expect(onEvent).toHaveBeenCalledTimes(3);
  });

  it("JSONパースに失敗しても処理を続行する", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onEvent = vi.fn();
    renderHook(() => useSSE(onEvent));

    const eventSource = MockEventSource.instances[0];
    // 無効なJSONを送信
    const invalidEvent = new MessageEvent("task:created", { data: "invalid json" });
    const listeners = eventSource.listeners["task:created"] ?? [];
    listeners.forEach((l) => {
      if (typeof l === "function") l(invalidEvent);
      else l.handleEvent(invalidEvent);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "SSEイベントのパースに失敗: task:created",
      "invalid json"
    );
    expect(onEvent).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("アンマウント時にすべてのリスナーを削除する", () => {
    const onEvent = vi.fn();
    const { unmount } = renderHook(() => useSSE(onEvent));

    const eventSource = MockEventSource.instances[0];
    const initialListenerCount = Object.values(eventSource.listeners).flat().length;
    expect(initialListenerCount).toBeGreaterThan(0);

    unmount();

    const afterUnmountListenerCount = Object.values(eventSource.listeners).flat().length;
    expect(afterUnmountListenerCount).toBe(0);
  });

  it("onEventコールバックが変更されると再接続する", () => {
    const onEvent1 = vi.fn();
    const onEvent2 = vi.fn();

    const { rerender } = renderHook(({ onEvent }) => useSSE(onEvent), {
      initialProps: { onEvent: onEvent1 },
    });

    expect(MockEventSource.instances.length).toBe(1);

    rerender({ onEvent: onEvent2 });

    expect(MockEventSource.instances.length).toBe(2);
    expect(MockEventSource.instances[0].close).toHaveBeenCalled();
  });
});
