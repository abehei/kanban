import { useEffect } from "react";
import type { SSEEvent } from "../types";

type SSEEventHandler = (event: SSEEvent) => void;

export function useSSE(onEvent: SSEEventHandler): void {
  useEffect(() => {
    const eventSource = new EventSource("/api/events");
    const eventNames: SSEEvent["type"][] = [
      "task:created",
      "task:updated",
      "task:deleted",
      "comment:added",
      "agent:status",
    ];

    const handlers = eventNames.map((eventName) => {
      const handler = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          onEvent({ type: eventName, data } as SSEEvent);
        } catch {
          console.error(`SSEイベントのパースに失敗: ${eventName}`, e.data);
        }
      };
      eventSource.addEventListener(eventName, handler);
      return { eventName, handler };
    });

    return () => {
      for (const { eventName, handler } of handlers) {
        eventSource.removeEventListener(eventName, handler);
      }
      eventSource.close();
    };
  }, [onEvent]);
}
