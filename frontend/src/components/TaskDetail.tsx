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
  onTaskDeleted: () => void;
}

export function TaskDetail({ task, subtasks, onClose, onTaskUpdated, onTaskDeleted }: TaskDetailProps) {
  const [isThinkingLogOpen, setIsThinkingLogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isSavingSubtask, setIsSavingSubtask] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  async function handleSubtaskEditStart(subtask: Task) {
    setEditingSubtaskId(subtask.id);
    setEditingTitle(subtask.title);
  }

  async function handleSubtaskSave(subtaskId: string) {
    if (!editingTitle.trim()) {
      setEditingSubtaskId(null);
      return;
    }

    setIsSavingSubtask(true);
    try {
      await taskApi.updateSubtask(task.id, subtaskId, { title: editingTitle });
      setEditingSubtaskId(null);
    } finally {
      setIsSavingSubtask(false);
    }
  }

  function handleSubtaskCancel() {
    setEditingSubtaskId(null);
    setEditingTitle("");
  }

  function handleSubtaskKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      handleSubtaskCancel();
    }
  }

  function handleTitleEditStart() {
    setIsEditingTitle(true);
    setEditingTitleValue(task.title);
  }

  async function handleTitleSave() {
    if (!editingTitleValue.trim()) {
      setIsEditingTitle(false);
      return;
    }
    setIsSavingTitle(true);
    try {
      const updated = await taskApi.update(task.id, { title: editingTitleValue });
      onTaskUpdated(updated);
      setIsEditingTitle(false);
    } finally {
      setIsSavingTitle(false);
    }
  }

  function handleTitleCancel() {
    setIsEditingTitle(false);
    setEditingTitleValue("");
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      handleTitleCancel();
    }
  }

  async function handleDelete() {
    if (!window.confirm("このタスクを削除してもよろしいですか？")) {
      return;
    }

    setIsDeleting(true);
    try {
      await taskApi.delete(task.id);
      onTaskDeleted();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white dark:bg-slate-900">
      {/* ヘッダー */}
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 gap-3 dark:border-slate-700">
        {isEditingTitle ? (
          <div className="flex flex-1 flex-col gap-1">
            <textarea
              autoFocus
              rows={2}
              value={editingTitleValue}
              onChange={(e) => setEditingTitleValue(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              disabled={isSavingTitle}
              className="rounded border border-blue-300 bg-white px-2 py-1 text-base sm:text-base text-slate-800 font-semibold focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:opacity-50 resize-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            />
            <div className="flex gap-1">
              <button
                onClick={handleTitleSave}
                disabled={isSavingTitle}
                className="rounded bg-blue-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                保存
              </button>
              <button
                onClick={handleTitleCancel}
                disabled={isSavingTitle}
                className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <h2
            onClick={handleTitleEditStart}
            className="text-base font-semibold text-slate-800 leading-snug pr-4 flex-1 cursor-pointer hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
          >
            {task.title}
          </h2>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-400 hover:text-red-600 text-lg leading-none dark:text-red-500 dark:hover:text-red-400 disabled:opacity-50"
            title="削除"
          >
            🗑️
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none dark:text-slate-500 dark:hover:text-slate-300"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5">
        {/* 説明 */}
        {task.description && (
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">説明</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap dark:text-slate-300">{task.description}</p>
          </div>
        )}

        {/* ステータス・担当 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 w-16">カラム</span>
            <select
              value={task.column}
              onChange={(e) => handleColumnChange(e.target.value as ColumnId)}
              className="rounded border border-slate-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
            >
              {COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>{col.label}</option>
              ))}
            </select>
          </div>

          {task.assigned_agent && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 w-16">担当</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">🤖 {task.assigned_agent}</span>
            </div>
          )}
        </div>

        {/* 進捗バー */}
        {task.progress > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>{task.current_step ?? "処理中..."}</span>
              <span>{task.progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
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
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              サブタスク ({subtasks.filter((s) => s.column === "done").length}/{subtasks.length})
            </h3>
            <div className="flex flex-col gap-1.5">
              {subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                  <span className="text-sm">
                    {sub.column === "done" ? "✅" : sub.column === "in-progress" ? "🔄" : "⬜"}
                  </span>
                  {editingSubtaskId === sub.id ? (
                    <div className="flex flex-1 flex-col gap-1">
                      <textarea
                        autoFocus
                        rows={2}
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={handleSubtaskKeyDown}
                        disabled={isSavingSubtask}
                        className="rounded border border-blue-300 bg-white px-2 py-1 text-sm sm:text-xs text-slate-700 focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:opacity-50 resize-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSubtaskSave(sub.id)}
                          disabled={isSavingSubtask}
                          className="rounded bg-blue-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleSubtaskCancel}
                          disabled={isSavingSubtask}
                          className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span
                      onClick={() => handleSubtaskEditStart(sub)}
                      className="flex-1 text-xs text-slate-700 cursor-pointer hover:text-blue-600 hover:underline dark:text-slate-300 dark:hover:text-blue-400"
                    >
                      {sub.title}
                    </span>
                  )}
                  {sub.assigned_agent && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">🤖 {sub.assigned_agent}</span>
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
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              <span>思考ログ ({task.thinking_log.length}件)</span>
              <span>{isThinkingLogOpen ? "▲" : "▶"}</span>
            </button>
            {isThinkingLogOpen && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                {task.thinking_log.map((log, index) => (
                  <p key={index} className="text-xs text-slate-500 mb-1 leading-relaxed dark:text-slate-400">
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
