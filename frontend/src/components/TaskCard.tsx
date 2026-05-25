import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../types";
import { getTaskColorClasses } from "../constants/taskColors";

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  subtaskCount: number;
  completedSubtaskCount: number;
  parentTitle?: string;
  onClick: (task: Task) => void;
}

export function TaskCard({
  task,
  isSelected,
  subtaskCount,
  completedSubtaskCount,
  parentTitle,
  onClick,
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className={[
        "cursor-pointer select-none rounded-lg border p-3 shadow-sm",
        getTaskColorClasses(task.color),
        "hover:border-accent-400 hover:shadow-md transition-all duration-150",
        "dark:shadow-slate-900/30",
        "dark:hover:border-accent-500",
        isSelected
          ? "border-accent-500 ring-2 ring-accent-400/30 dark:border-accent-400 dark:ring-accent-400/30"
          : "border-slate-200 dark:border-slate-600",
        isDragging ? "opacity-50" : "opacity-100",
      ].join(" ")}
    >
      {/* 親タスク表示（サブタスクの場合） */}
      {parentTitle && (
        <p className="mb-1 text-xs text-slate-400 dark:text-slate-500 truncate">
          ↳ {parentTitle}
        </p>
      )}

      {/* タイトル */}
      <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2 dark:text-slate-100">
        {task.title}
      </p>

      {/* 担当エージェント */}
      {task.assigned_agent && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          🤖 {task.assigned_agent}
        </p>
      )}

      {/* エラー表示 */}
      {task.error && (
        <p className="mt-1 text-xs text-red-500 dark:text-red-400 truncate">⚠ {task.error}</p>
      )}

      {/* サブタスク数 */}
      {subtaskCount > 0 && (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          📋 {completedSubtaskCount}/{subtaskCount} サブタスク
        </p>
      )}

      {/* 進捗バー */}
      {task.progress > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-1">
            <span>{task.current_step ?? "処理中..."}</span>
            <span>{task.progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-600">
            <div
              className="h-1.5 rounded-full bg-accent-500 transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
