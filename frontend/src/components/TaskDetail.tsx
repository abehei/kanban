import { useState } from "react";
import type { Task, ColumnId } from "../types";
import { COLUMNS } from "../types";
import { taskApi } from "../api/client";
import { CommentThread } from "./CommentThread";

interface TaskDetailProps {
  task: Task;
  subtasks: Task[];
  onClose: () => void;
  onTaskUpdated: (updated: Task) => void;
}

export function TaskDetail({ task, subtasks, onClose, onTaskUpdated }: TaskDetailProps) {
  const [isThinkingLogOpen, setIsThinkingLogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  async function handleColumnChange(newColumn: ColumnId) {
    const updated = await taskApi.update(task.id, { column: newColumn });
    onTaskUpdated(updated);
  }

  async function handleApprove() {
    setIsApproving(true);
    try {
      const updated = await taskApi.update(task.id, { column: "review" });
      onTaskUpdated(updated);
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReject() {
    const updated = await taskApi.update(task.id, { column: "backlog" });
    onTaskUpdated(updated);
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white">
      {/* ヘッダー */}
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-800 leading-snug pr-4">
          {task.title}
        </h2>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-5 p-5">
        {/* 説明 */}
        {task.description && (
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">説明</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {/* ステータス・担当 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 w-16">カラム</span>
            <select
              value={task.column}
              onChange={(e) => handleColumnChange(e.target.value as ColumnId)}
              className="rounded border border-slate-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
            >
              {COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>{col.label}</option>
              ))}
            </select>
          </div>

          {task.assigned_agent && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 w-16">担当</span>
              <span className="text-sm text-slate-700">🤖 {task.assigned_agent}</span>
            </div>
          )}
        </div>

        {/* 進捗バー */}
        {task.progress > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{task.current_step ?? "処理中..."}</span>
              <span>{task.progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-blue-400 transition-all duration-300"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {task.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-xs font-semibold text-red-600 mb-1">エラー</p>
            <p className="text-xs text-red-500">{task.error}</p>
          </div>
        )}

        {/* サブタスク */}
        {subtasks.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              サブタスク ({subtasks.filter((s) => s.column === "done").length}/{subtasks.length})
            </h3>
            <div className="flex flex-col gap-1.5">
              {subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-sm">
                    {sub.column === "done" ? "✅" : sub.column === "in-progress" ? "🔄" : "⬜"}
                  </span>
                  <span className="text-xs text-slate-700 flex-1">{sub.title}</span>
                  {sub.assigned_agent && (
                    <span className="text-xs text-slate-400">🤖 {sub.assigned_agent}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 思考ログ（折りたたみ） */}
        {task.thinking_log.length > 0 && (
          <div>
            <button
              onClick={() => setIsThinkingLogOpen(!isThinkingLogOpen)}
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
            >
              <span>思考ログ ({task.thinking_log.length}件)</span>
              <span>{isThinkingLogOpen ? "▲" : "▶"}</span>
            </button>
            {isThinkingLogOpen && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-slate-50 p-3">
                {task.thinking_log.map((log, index) => (
                  <p key={index} className="text-xs text-slate-500 mb-1 leading-relaxed">
                    {log}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 承認ゲート（Waitingカラムのみ表示） */}
        {task.column === "waiting" && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="mb-3 text-sm font-medium text-yellow-800">
              このタスクは人間の確認を待っています
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="flex-1 rounded bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
              >
                ✅ 承認する
              </button>
              <button
                onClick={handleReject}
                className="flex-1 rounded bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300"
              >
                ↩ 差し戻す
              </button>
            </div>
          </div>
        )}

        {/* コメントスレッド */}
        <CommentThread taskId={task.id} />
      </div>
    </div>
  );
}
