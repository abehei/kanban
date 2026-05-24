import Anthropic from "@anthropic-ai/sdk";
import { kanbanApi } from "./kanban-client.js";

// Claude APIに渡すツール定義
export const KANBAN_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_tasks",
    description: "カンバンボードのタスク一覧を取得する。特定カラムに絞り込むことも可能。",
    input_schema: {
      type: "object" as const,
      properties: {
        column: {
          type: "string",
          enum: ["backlog", "in-progress", "waiting", "review", "done"],
          description: "絞り込むカラム名（省略時は全カラム）",
        },
      },
    },
  },
  {
    name: "create_task",
    description: "新しいタスクをカンバンボードに作成する。デフォルトはBacklogカラム。",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "タスクのタイトル" },
        description: { type: "string", description: "タスクの詳細説明" },
        column: {
          type: "string",
          enum: ["backlog", "in-progress", "waiting", "review", "done"],
          description: "作成先カラム（省略時はbacklog）",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "タスクのステータス・進捗・担当エージェント・現在のステップを更新する。",
    input_schema: {
      type: "object" as const,
      properties: {
        task_id: { type: "string", description: "更新するタスクのID" },
        column: {
          type: "string",
          enum: ["backlog", "in-progress", "waiting", "review", "done"],
          description: "移動先カラム",
        },
        progress: { type: "number", description: "進捗率（0〜100）" },
        current_step: { type: "string", description: "現在実行中のステップの説明" },
        assigned_agent: { type: "string", description: "担当エージェント名" },
        error: { type: "string", description: "エラーメッセージ（エラー発生時のみ）" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "add_subtask",
    description: "既存タスクにサブタスクを追加する。",
    input_schema: {
      type: "object" as const,
      properties: {
        parent_task_id: { type: "string", description: "親タスクのID" },
        title: { type: "string", description: "サブタスクのタイトル" },
        description: { type: "string", description: "サブタスクの詳細説明" },
        assigned_agent: { type: "string", description: "担当エージェント名" },
      },
      required: ["parent_task_id", "title"],
    },
  },
  {
    name: "post_comment",
    description: "タスクにコメントを投稿する。進捗報告や人間への質問に使う。",
    input_schema: {
      type: "object" as const,
      properties: {
        task_id: { type: "string", description: "コメントを投稿するタスクのID" },
        content: { type: "string", description: "コメントの内容" },
      },
      required: ["task_id", "content"],
    },
  },
  {
    name: "move_to_waiting",
    description: "タスクをWaitingカラムに移動し、人間の承認を要求する。承認が必要な作業の前に呼ぶ。",
    input_schema: {
      type: "object" as const,
      properties: {
        task_id: { type: "string", description: "Waitingに移動するタスクのID" },
        reason: { type: "string", description: "承認が必要な理由や確認してほしい内容" },
      },
      required: ["task_id", "reason"],
    },
  },
];

// ツール名から対応する関数を呼び出す
export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  agentId: string
): Promise<string> {
  switch (toolName) {
    case "get_tasks": {
      const tasks = await kanbanApi.listTasks(toolInput.column as string | undefined);
      return JSON.stringify(tasks, null, 2);
    }

    case "create_task": {
      const task = await kanbanApi.createTask({
        title: toolInput.title as string,
        description: toolInput.description as string | undefined,
        column: (toolInput.column as string | undefined) ?? "backlog",
        assigned_agent: agentId,
      });
      return JSON.stringify(task, null, 2);
    }

    case "update_task": {
      const task = await kanbanApi.updateTask(toolInput.task_id as string, {
        column: toolInput.column as string | undefined,
        progress: toolInput.progress as number | undefined,
        current_step: toolInput.current_step as string | undefined,
        assigned_agent: toolInput.assigned_agent as string | undefined,
        error: toolInput.error as string | undefined,
      });
      return JSON.stringify(task, null, 2);
    }

    case "add_subtask": {
      const subtask = await kanbanApi.addSubtask(toolInput.parent_task_id as string, {
        title: toolInput.title as string,
        description: toolInput.description as string | undefined,
        assigned_agent: toolInput.assigned_agent as string | undefined,
      });
      return JSON.stringify(subtask, null, 2);
    }

    case "post_comment": {
      await kanbanApi.postComment(toolInput.task_id as string, {
        author: agentId,
        content: toolInput.content as string,
      });
      return "コメントを投稿しました";
    }

    case "move_to_waiting": {
      const task = await kanbanApi.updateTask(toolInput.task_id as string, {
        column: "waiting",
      });
      await kanbanApi.postComment(toolInput.task_id as string, {
        author: agentId,
        content: `承認をお願いします。\n\n${toolInput.reason as string}`,
      });
      return JSON.stringify(task, null, 2);
    }

    default:
      throw new Error(`未知のツール: ${toolName}`);
  }
}
