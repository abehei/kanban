import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ColumnDefinition, Task } from "../types";
import { TaskCard } from "./TaskCard";

interface ColumnProps {
  column: ColumnDefinition;
  tasks: Task[];
  allTasks: Task[];
  selectedTaskId: string | null;
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string) => void;
}

export function Column({
  column,
  tasks,
  allTasks,
  selectedTaskId,
  onTaskClick,
  onAddTask,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const subtasksOf = (taskId: string) =>
    allTasks.filter((t) => t.parent_id === taskId);

  return (
    <div className="flex w-56 sm:w-64 flex-shrink-0 flex-col rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
      {/* カラムヘッダー */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{column.label}</h2>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            {tasks.length}
          </span>
        </div>
        {column.id === "backlog" && (
          <button
            onClick={() => onAddTask(column.id)}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none dark:text-slate-500 dark:hover:text-slate-300"
            title="タスクを追加"
          >
            +
          </button>
        )}
      </div>

      {/* ドロップ可能エリア */}
      <div
        ref={setNodeRef}
        className={[
          "flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 min-h-32",
          isOver ? "bg-blue-50/50 rounded-b-xl dark:bg-blue-900/20" : "",
        ].join(" ")}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => {
            const subs = subtasksOf(task.id);
            const completedSubs = subs.filter((s) => s.column === "done");
            const parent = task.parent_id
              ? allTasks.find((t) => t.id === task.parent_id)
              : undefined;
            return (
              <TaskCard
                key={task.id}
                task={task}
                isSelected={selectedTaskId === task.id}
                subtaskCount={subs.length}
                completedSubtaskCount={completedSubs.length}
                parentTitle={parent?.title}
                onClick={onTaskClick}
              />
            );
          })}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-xs text-slate-400 py-4 dark:text-slate-600">
            タスクなし
          </div>
        )}
      </div>
    </div>
  );
}
