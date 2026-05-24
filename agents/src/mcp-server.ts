/**
 * カンバンボード MCP サーバー
 *
 * Claude Desktop / Claude Code CLI から接続して
 * カンバンボードを操作できるようにする。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { kanbanApi } from "./kanban-client.js";

const server = new McpServer({
  name: "agent-kanban",
  version: "1.0.0",
});

// ── タスク一覧取得 ──────────────────────────────────────────
server.tool(
  "get_tasks",
  "カンバンボードのタスク一覧を取得する。カラムでフィルタできる。",
  {
    column: z
      .enum(["backlog", "in-progress", "waiting", "review", "done"])
      .optional()
      .describe("絞り込むカラム（省略時は全カラム）"),
  },
  async ({ column }) => {
    const tasks = await kanbanApi.listTasks(column);
    return {
      content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
    };
  }
);

// ── タスク作成 ─────────────────────────────────────────────
server.tool(
  "create_task",
  "新しいタスクをカンバンボードに作成する。",
  {
    title: z.string().describe("タスクのタイトル"),
    description: z.string().optional().describe("タスクの詳細説明"),
    column: z
      .enum(["backlog", "in-progress", "waiting", "review", "done"])
      .optional()
      .describe("作成先カラム（省略時は backlog）"),
  },
  async ({ title, description, column }) => {
    const task = await kanbanApi.createTask({ title, description, column });
    return {
      content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
    };
  }
);

// ── タスク更新 ─────────────────────────────────────────────
server.tool(
  "update_task",
  "タスクのカラム・進捗・担当エージェント・現在のステップを更新する。",
  {
    task_id: z.string().describe("更新するタスクのID"),
    column: z
      .enum(["backlog", "in-progress", "waiting", "review", "done"])
      .optional()
      .describe("移動先カラム"),
    progress: z.number().min(0).max(100).optional().describe("進捗率（0〜100）"),
    current_step: z.string().optional().describe("現在実行中のステップの説明"),
    assigned_agent: z.string().optional().describe("担当エージェント名"),
    error: z.string().optional().describe("エラーメッセージ（エラー発生時のみ）"),
  },
  async ({ task_id, ...updates }) => {
    const task = await kanbanApi.updateTask(task_id, updates);
    return {
      content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
    };
  }
);

// ── サブタスク追加 ─────────────────────────────────────────
server.tool(
  "add_subtask",
  "既存のタスクにサブタスクを追加する。",
  {
    parent_task_id: z.string().describe("親タスクのID"),
    title: z.string().describe("サブタスクのタイトル"),
    description: z.string().optional().describe("サブタスクの詳細説明"),
    assigned_agent: z.string().optional().describe("担当エージェント名"),
  },
  async ({ parent_task_id, title, description, assigned_agent }) => {
    const subtask = await kanbanApi.addSubtask(parent_task_id, {
      title,
      description,
      assigned_agent,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(subtask, null, 2) }],
    };
  }
);

// ── コメント投稿 ───────────────────────────────────────────
server.tool(
  "post_comment",
  "タスクにコメントを投稿する。進捗報告や確認事項の共有に使う。",
  {
    task_id: z.string().describe("コメントを投稿するタスクのID"),
    content: z.string().describe("コメントの内容"),
    author: z.string().optional().describe("投稿者名（省略時は claude）"),
  },
  async ({ task_id, content, author = "claude" }) => {
    await kanbanApi.postComment(task_id, { author, content });
    return {
      content: [{ type: "text", text: "コメントを投稿しました" }],
    };
  }
);

// ── 承認待ちに移動 ─────────────────────────────────────────
server.tool(
  "move_to_waiting",
  "タスクをWaitingカラムに移動し、人間の確認を求める。承認が必要な作業の前に使う。",
  {
    task_id: z.string().describe("Waitingに移動するタスクのID"),
    reason: z.string().describe("承認が必要な理由・確認してほしい内容"),
  },
  async ({ task_id, reason }) => {
    await kanbanApi.updateTask(task_id, { column: "waiting" });
    await kanbanApi.postComment(task_id, {
      author: "claude",
      content: `承認をお願いします。\n\n${reason}`,
    });
    return {
      content: [{ type: "text", text: "Waitingカラムに移動し、コメントを投稿しました" }],
    };
  }
);

// サーバー起動
const transport = new StdioServerTransport();
await server.connect(transport);
