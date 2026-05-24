import { useState, useEffect, useCallback } from "react";
import type { Comment } from "../types";
import { taskApi } from "../api/client";

interface CommentThreadProps {
  taskId: string;
}

export function CommentThread({ taskId }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [inputText, setInputText] = useState("");
  const [authorName, setAuthorName] = useState("田中");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadComments = useCallback(() => {
    taskApi.listComments(taskId).then(setComments).catch(console.error);
  }, [taskId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsSubmitting(true);
    try {
      await taskApi.addComment(taskId, {
        author: authorName,
        author_type: "human",
        content: inputText.trim(),
      });
      setInputText("");
      loadComments();
    } catch (err) {
      console.error("コメント投稿失敗:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">コメント</h3>

      {/* コメント一覧 */}
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {comments.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500">コメントはまだありません</p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs">
                {comment.author_type === "agent" ? "🤖" : "🧑"}
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{comment.author}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {new Date(comment.created_at).toLocaleString("ja-JP", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-xs text-slate-600 whitespace-pre-wrap dark:text-slate-300">{comment.content}</p>
          </div>
        ))}
      </div>

      {/* 投稿フォーム */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="投稿者名"
          className="rounded border border-slate-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400"
        />
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="コメントを入力..."
          rows={2}
          className="rounded border border-slate-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none resize-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400"
        />
        <button
          type="submit"
          disabled={isSubmitting || !inputText.trim()}
          className="self-end rounded bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          送信
        </button>
      </form>
    </div>
  );
}
