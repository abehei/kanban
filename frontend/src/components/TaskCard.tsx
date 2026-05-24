import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../types";

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  subtaskCount: number;
  completedSubtaskCount: number;
  onClick: (task: Task) => void;
}

export function TaskCard({
  task,
  isSelected,
  subtaskCount,
  completedSubtaskCount,
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
        "cursor-pointer select-none rounded-lg border bg-white p-3 shadow-sm",
        "hover:border-blue-300 hover:shadow-md transition-all duration-150",
        isSelected ? "border-blue-400 ring-2 ring-blue-200" : "border-slate-200",
        isDragging ? "opacity-50" : "opacity-100",
      ].join(" ")}
    >
      {/* タイトル */}
      <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2">
        {task.title}
      </p>

      {/* 担当エージェント */}
      {task.assigned_agent && (
        <p className="mt-1.5 text-xs text-slate-500">
          🤖 {task.assigned_agent}
        </p>
      )}

      {/* エラー表示 */}
      {task.error && (
        <p className="mt-1 text-xs text-red-500 truncate">⚠ {task.error}</p>
      )}

      {/* サブタスク数 */}
      {subtaskCount > 0 && (
        <p className="mt-1 text-xs text-slate-400">
          📋 {completedSubtaskCount}/{subtaskCount} サブタスク
        </p>
      )}

      {/* 進捗バー */}
      {task.progress > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{task.current_step ?? "処理中..."}</span>
            <span>{task.progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-blue-400 transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
