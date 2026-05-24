import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Task, ColumnId } from "../types";
import { COLUMNS } from "../types";
import { Column } from "./Column";
import { TaskDetail } from "./TaskDetail";
import { useTasks } from "../hooks/useTasks";

interface NewTaskModalProps {
  onSubmit: (title: string, description: string) => void;
  onCancel: () => void;
}

function NewTaskModal({ onSubmit, onCancel }: NewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), description.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-96 rounded-xl bg-white p-5 shadow-xl dark:bg-slate-800">
        <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">タスクを追加</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タスクのタイトル"
            className="rounded-lg border border-slate-200 px-3 py-2 text-base sm:text-sm focus:border-blue-400 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="説明（任意）"
            rows={3}
            className="rounded-lg border border-slate-200 px-3 py-2 text-base sm:text-sm focus:border-blue-400 focus:outline-none resize-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
          />
          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface BoardProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Board({ isDark, onToggleTheme }: BoardProps) {
  const { tasks, agentStatuses, isLoading, error, moveTask, createTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const topLevelTasks = tasks.filter((t) => t.parent_id === null);

  function tasksForColumn(columnId: ColumnId) {
    return topLevelTasks.filter((t) => t.column === columnId);
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingTaskId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingTaskId(null);

    const { active, over } = event;
    if (!over) return;

    const targetColumnId = over.id as ColumnId;
    const isValidColumn = COLUMNS.some((c) => c.id === targetColumnId);

    if (isValidColumn && active.id !== over.id) {
      moveTask(String(active.id), targetColumnId);
    }
  }

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask((prev) => (prev?.id === task.id ? null : task));
  }, []);

  const handleTaskUpdated = useCallback((updated: Task) => {
    setSelectedTask(updated);
  }, []);

  async function handleCreateTask(title: string, description: string) {
    await createTask(title, description);
    setIsNewTaskModalOpen(false);
  }

  const draggingTask = draggingTaskId
    ? tasks.find((t) => t.id === draggingTaskId)
    : null;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400 dark:bg-slate-900">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-500 dark:bg-slate-900">
        エラー: {error}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-100 dark:bg-slate-900">
      {/* ヘッダー */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 shadow-sm dark:bg-slate-900 dark:border-slate-700">
        <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">Agent Kanban</h1>

        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          {Array.from(agentStatuses.values()).map((status) => (
            <div
              key={status.agentId}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  status.status === "running"
                    ? "bg-green-400 animate-pulse"
                    : status.status === "error"
                    ? "bg-red-400"
                    : "bg-slate-400"
                }`}
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">🤖 {status.agentId}</span>
              {status.step && (
                <span className="text-slate-400 truncate max-w-32">— {status.step}</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            + <span className="hidden sm:inline">タスク</span>追加
          </button>
        </div>
      </header>

      {/* ボード本体 */}
      <div className="flex flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* カンバンカラム */}
          <div className="flex flex-1 gap-3 overflow-x-auto p-4">
            {COLUMNS.map((column) => (
              <Column
                key={column.id}
                column={column}
                tasks={tasksForColumn(column.id)}
                allTasks={tasks}
                selectedTaskId={selectedTask?.id ?? null}
                onTaskClick={handleTaskClick}
                onAddTask={() => setIsNewTaskModalOpen(true)}
              />
            ))}
          </div>

          <DragOverlay>
            {draggingTask && (
              <div className="rounded-lg border border-blue-300 bg-white p-3 shadow-lg opacity-90 w-64 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100">
                <p className="text-sm font-medium">{draggingTask.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* 右スライドパネル */}
        {selectedTask && (
          <>
            {/* モバイル用オーバーレイ背景 */}
            <div
              className="fixed inset-0 z-30 bg-black/40 sm:hidden"
              onClick={() => setSelectedTask(null)}
            />
            {/* パネル本体 */}
            <div className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto bg-white shadow-lg dark:bg-slate-900 sm:relative sm:inset-auto sm:top-auto sm:z-auto sm:w-80 sm:flex-shrink-0 sm:border-l sm:border-slate-200 sm:dark:border-slate-700">
              <TaskDetail
                task={selectedTask}
                subtasks={tasks.filter((t) => t.parent_id === selectedTask.id)}
                onClose={() => setSelectedTask(null)}
                onTaskUpdated={handleTaskUpdated}
              />
            </div>
          </>
        )}
      </div>

      {/* タスク追加モーダル */}
      {isNewTaskModalOpen && (
        <NewTaskModal
          onSubmit={handleCreateTask}
          onCancel={() => setIsNewTaskModalOpen(false)}
        />
      )}
    </div>
  );
}
