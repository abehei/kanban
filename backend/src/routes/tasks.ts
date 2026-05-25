import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/database";
import { broadcast } from "../sse/emitter";

const router = Router();

// タスク一覧取得
router.get("/", (req: Request, res: Response) => {
  const db = getDatabase();
  const { column, parent_id } = req.query;

  let query = "SELECT * FROM tasks WHERE 1=1";
  const params: unknown[] = [];

  if (column) {
    query += " AND column = ?";
    params.push(column);
  }
  if (parent_id) {
    query += " AND parent_id = ?";
    params.push(parent_id);
  } else if (parent_id === null || req.query.parent_id === "null") {
    query += " AND parent_id IS NULL";
  }

  query += " ORDER BY created_at ASC";

  const tasks = db.prepare(query).all(...params);
  const tasksWithParsedLogs = tasks.map(parseTaskJsonFields);

  res.json(tasksWithParsedLogs);
});

// タスク詳細取得
router.get("/:id", (req: Request, res: Response) => {
  const db = getDatabase();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);

  if (!task) {
    res.status(404).json({ error: "タスクが見つかりません" });
    return;
  }

  res.json(parseTaskJsonFields(task));
});

// タスク作成
router.post("/", (req: Request, res: Response) => {
  const { title, description = "", column = "backlog", assigned_agent, parent_id, color } = req.body;

  if (!title) {
    res.status(400).json({ error: "タイトルは必須です" });
    return;
  }

  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const newTask = {
      id: uuidv4(),
      title,
      description,
      column,
      parent_id: parent_id ?? null,
      assigned_agent: assigned_agent ?? null,
      progress: 0,
      current_step: null,
      thinking_log: "[]",
      error: null,
      color: color ?? null,
      created_at: now,
      updated_at: now,
    };

    db.prepare(`
      INSERT INTO tasks (id, title, description, column, parent_id, assigned_agent, progress, current_step, thinking_log, error, color, created_at, updated_at)
      VALUES (@id, @title, @description, @column, @parent_id, @assigned_agent, @progress, @current_step, @thinking_log, @error, @color, @created_at, @updated_at)
    `).run(newTask);

    const created = parseTaskJsonFields(newTask);
    broadcast("task:created", created);
    res.status(201).json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : "タスクの作成に失敗しました";
    res.status(400).json({ error: message });
  }
});

// タスク更新
router.patch("/:id", (req: Request, res: Response) => {
  const db = getDatabase();
  const existingTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);

  if (!existingTask) {
    res.status(404).json({ error: "タスクが見つかりません" });
    return;
  }

  const allowedFields = [
    "title", "description", "column", "assigned_agent",
    "progress", "current_step", "thinking_log", "error", "color",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in req.body) {
      updates[field] = field === "thinking_log"
        ? JSON.stringify(req.body[field])
        : req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "更新するフィールドがありません" });
    return;
  }

  updates.updated_at = new Date().toISOString();

  try {
    const setClause = Object.keys(updates).map((k) => `${k} = @${k}`).join(", ");
    db.prepare(`UPDATE tasks SET ${setClause} WHERE id = @id`).run({
      ...updates,
      id: req.params.id,
    });

    const updatedTask = parseTaskJsonFields(
      db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id)
    );
    broadcast("task:updated", updatedTask);
    res.json(updatedTask);
  } catch (err) {
    const message = err instanceof Error ? err.message : "タスクの更新に失敗しました";
    res.status(400).json({ error: message });
  }
});

// タスク削除
router.delete("/:id", (req: Request, res: Response) => {
  const db = getDatabase();
  const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ error: "タスクが見つかりません" });
    return;
  }

  broadcast("task:deleted", { id: req.params.id });
  res.status(204).send();
});

// サブタスク追加
router.post("/:id/subtasks", (req: Request, res: Response) => {
  const db = getDatabase();
  const parentTask = db.prepare("SELECT id FROM tasks WHERE id = ?").get(req.params.id);

  if (!parentTask) {
    res.status(404).json({ error: "親タスクが見つかりません" });
    return;
  }

  const { title, description = "", assigned_agent } = req.body;

  if (!title) {
    res.status(400).json({ error: "タイトルは必須です" });
    return;
  }

  const now = new Date().toISOString();
  const subtask = {
    id: uuidv4(),
    title,
    description,
    column: "backlog",
    parent_id: req.params.id,
    assigned_agent: assigned_agent ?? null,
    progress: 0,
    current_step: null,
    thinking_log: "[]",
    error: null,
    color: null,
    created_at: now,
    updated_at: now,
  };

  try {
    db.prepare(`
      INSERT INTO tasks (id, title, description, column, parent_id, assigned_agent, progress, current_step, thinking_log, error, color, created_at, updated_at)
      VALUES (@id, @title, @description, @column, @parent_id, @assigned_agent, @progress, @current_step, @thinking_log, @error, @color, @created_at, @updated_at)
    `).run(subtask);

    const created = parseTaskJsonFields(subtask);
    broadcast("task:created", created);
    res.status(201).json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : "サブタスクの作成に失敗しました";
    res.status(400).json({ error: message });
  }
});

// コメント一覧取得
router.get("/:id/comments", (req: Request, res: Response) => {
  const db = getDatabase();
  const comments = db
    .prepare("SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC")
    .all(req.params.id);

  res.json(comments.map(parseCommentJsonFields));
});

// コメント投稿
router.post("/:id/comments", (req: Request, res: Response) => {
  const db = getDatabase();
  const taskExists = db.prepare("SELECT id FROM tasks WHERE id = ?").get(req.params.id);

  if (!taskExists) {
    res.status(404).json({ error: "タスクが見つかりません" });
    return;
  }

  const { author, author_type = "human", content, mentions = [] } = req.body;

  if (!author || !content) {
    res.status(400).json({ error: "author と content は必須です" });
    return;
  }

  const newComment = {
    id: uuidv4(),
    task_id: req.params.id,
    author,
    author_type,
    content,
    mentions: JSON.stringify(mentions),
    created_at: new Date().toISOString(),
  };

  try {
    db.prepare(`
      INSERT INTO comments (id, task_id, author, author_type, content, mentions, created_at)
      VALUES (@id, @task_id, @author, @author_type, @content, @mentions, @created_at)
    `).run(newComment);

    const created = parseCommentJsonFields(newComment);
    broadcast("comment:added", created);
    res.status(201).json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : "コメントの投稿に失敗しました";
    res.status(400).json({ error: message });
  }
});

// SQLiteから取得したタスクのJSON文字列フィールドをパースする
function parseTaskJsonFields(task: unknown): unknown {
  const t = task as Record<string, unknown>;
  return {
    ...t,
    thinking_log: typeof t.thinking_log === "string"
      ? JSON.parse(t.thinking_log)
      : t.thinking_log,
  };
}

// SQLiteから取得したコメントのJSON文字列フィールドをパースする
function parseCommentJsonFields(comment: unknown): unknown {
  const c = comment as Record<string, unknown>;
  return {
    ...c,
    mentions: typeof c.mentions === "string"
      ? JSON.parse(c.mentions)
      : c.mentions,
  };
}

export default router;
