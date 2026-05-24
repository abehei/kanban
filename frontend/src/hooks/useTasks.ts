import { useReducer, useCallback, useEffect } from "react";
import type { Task, AgentStatus, SSEEvent } from "../types";
import { taskApi } from "../api/client";
import { useSSE } from "./useSSE";

type State = {
  tasks: Task[];
  agentStatuses: Map<string, AgentStatus>;
  isLoading: boolean;
  error: string | null;
};

type Action =
  | { type: "SET_TASKS"; tasks: Task[] }
  | { type: "ADD_OR_UPDATE_TASK"; task: Task }
  | { type: "REMOVE_TASK"; id: string }
  | { type: "SET_AGENT_STATUS"; status: AgentStatus }
  | { type: "SET_LOADING"; isLoading: boolean }
  | { type: "SET_ERROR"; error: string | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_TASKS":
      return { ...state, tasks: action.tasks, isLoading: false };

    case "ADD_OR_UPDATE_TASK": {
      const exists = state.tasks.some((t) => t.id === action.task.id);
      const tasks = exists
        ? state.tasks.map((t) => (t.id === action.task.id ? action.task : t))
        : [...state.tasks, action.task];
      return { ...state, tasks };
    }

    case "REMOVE_TASK":
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };

    case "SET_AGENT_STATUS": {
      const next = new Map(state.agentStatuses);
      next.set(action.status.agentId, action.status);
      return { ...state, agentStatuses: next };
    }

    case "SET_LOADING":
      return { ...state, isLoading: action.isLoading };

    case "SET_ERROR":
      return { ...state, error: action.error };

    default:
      return state;
  }
}

const INITIAL_STATE: State = {
  tasks: [],
  agentStatuses: new Map(),
  isLoading: true,
  error: null,
};

export function useTasks() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // 初回マウント時にタスク一覧を取得
  useEffect(() => {
    taskApi
      .list()
      .then((tasks) => dispatch({ type: "SET_TASKS", tasks }))
      .catch((err) => dispatch({ type: "SET_ERROR", error: String(err) }));
  }, []);

  // SSEイベントを受け取り、状態を更新する
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case "task:created":
      case "task:updated":
        dispatch({ type: "ADD_OR_UPDATE_TASK", task: event.data });
        break;
      case "task:deleted":
        dispatch({ type: "REMOVE_TASK", id: event.data.id });
        break;
      case "agent:status":
        dispatch({ type: "SET_AGENT_STATUS", status: event.data });
        break;
    }
  }, []);

  useSSE(handleSSEEvent);

  const moveTask = useCallback(async (taskId: string, targetColumn: Task["column"]) => {
    try {
      await taskApi.update(taskId, { column: targetColumn });
    } catch (err) {
      dispatch({ type: "SET_ERROR", error: String(err) });
    }
  }, []);

  const createTask = useCallback(async (title: string, description?: string) => {
    try {
      await taskApi.create({ title, description, column: "backlog" });
    } catch (err) {
      dispatch({ type: "SET_ERROR", error: String(err) });
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await taskApi.delete(taskId);
    } catch (err) {
      dispatch({ type: "SET_ERROR", error: String(err) });
    }
  }, []);

  return {
    tasks: state.tasks,
    agentStatuses: state.agentStatuses,
    isLoading: state.isLoading,
    error: state.error,
    moveTask,
    createTask,
    deleteTask,
  };
}
