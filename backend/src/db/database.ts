import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "../../../data/kanban.db");

let db: Database.Database;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      column       TEXT NOT NULL DEFAULT 'backlog'
                        CHECK (column IN ('backlog','in-progress','waiting','review','done')),
      parent_id    TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      assigned_agent TEXT,
      progress     INTEGER NOT NULL DEFAULT 0
                        CHECK (progress >= 0 AND progress <= 100),
      current_step TEXT,
      thinking_log TEXT NOT NULL DEFAULT '[]',
      error        TEXT,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id          TEXT PRIMARY KEY,
      task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      author      TEXT NOT NULL,
      author_type TEXT NOT NULL CHECK (author_type IN ('human', 'agent')),
      content     TEXT NOT NULL,
      mentions    TEXT NOT NULL DEFAULT '[]',
      created_at  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_column    ON tasks(column);
    CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
    CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
  `);
}
