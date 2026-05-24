/**
 * メインエージェント — Backlogのタスクを監視し、サブタスクに分解して並列処理する
 *
 * 起動すると Backlog を定期的にポーリングし、
 * タスクを見つけたら分解して複数のサブエージェントに並列で渡す。
 */

import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import { KANBAN_TOOLS, executeTool } from "./tools.js";
import { runSubAgent } from "./sub-agent.js";
import { kanbanApi } from "./kanban-client.js";

config(); // .env を読み込む

const client = new Anthropic();
const MAIN_AGENT_ID = "main-agent";
const POLL_INTERVAL_MS = 5000;

const MAIN_AGENT_SYSTEM_PROMPT = `
あなたはメインエージェントです。カンバンボードのBacklogにあるタスクを受け取り、
サブタスクに分解して管理します。

## あなたの動き方
1. get_tasks で Backlog のタスクを確認する
2. タスクを見つけたら update_task でカラムを "in-progress" に変更する（二重処理を防ぐ）
3. タスクの内容を分析し、3〜5個のサブタスクに分解する
4. add_subtask で各サブタスクをカンバンボードに登録する
5. post_comment で分解した内容を報告する
6. 完了したら「SUBTASKS_READY: <task_id>」というテキストで終了する

## サブタスクの分解方針
- 各サブタスクは独立して実行できる粒度にする
- サブタスク名は具体的な動詞から始める（「実装する」「テストする」など）
- フォーク先のプロジェクト要件に合わせてカスタマイズすること

## 注意事項
- 処理中のタスクには "in-progress" をセットして二重処理を防ぐ
- 人間の最終承認が必要なタスクは move_to_waiting を使う
`.trim();

async function decomposeTask(taskId: string): Promise<void> {
  console.log(`[${MAIN_AGENT_ID}] タスク ${taskId} を分解中...`);

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `タスク ID: ${taskId} をサブタスクに分解して処理してください。まず get_tasks でタスクの内容を確認してください。`,
    },
  ];

  // ツール呼び出しが終わるまでループ
  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: MAIN_AGENT_SYSTEM_PROMPT,
      tools: KANBAN_TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    // テキストに "SUBTASKS_READY" が含まれていたら分解完了
    const textContent = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("");

    if (textContent.includes("SUBTASKS_READY")) {
      console.log(`[${MAIN_AGENT_ID}] タスク ${taskId} の分解完了`);
      break;
    }

    if (response.stop_reason === "end_turn") break;
    if (response.stop_reason !== "tool_use") break;

    // ツールを実行する
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      console.log(`[${MAIN_AGENT_ID}] ツール実行: ${block.name}`);

      try {
        const result = await executeTool(
          block.name,
          block.input as Record<string, unknown>,
          MAIN_AGENT_ID
        );
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `エラー: ${errorMessage}`,
          is_error: true,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  // 分解されたサブタスクを取得してサブエージェントに並列で渡す
  const subtasks = await kanbanApi.listTasks("backlog");
  const taskSubtasks = subtasks.filter((t) => t.parent_id === taskId);

  if (taskSubtasks.length === 0) {
    console.log(`[${MAIN_AGENT_ID}] サブタスクが見つかりませんでした`);
    return;
  }

  console.log(`[${MAIN_AGENT_ID}] ${taskSubtasks.length}件のサブタスクを並列実行`);

  // サブエージェントを並列で起動する
  await Promise.allSettled(
    taskSubtasks.map((subtask, index) =>
      runSubAgent({
        agentId: `sub-agent-${index + 1}`,
        taskId: subtask.id,
      })
    )
  );

  // 全サブタスク完了後、親タスクも Done に移動する
  const updatedSubtasks = await kanbanApi.listTasks();
  const allDone = taskSubtasks.every(
    (sub) => updatedSubtasks.find((t) => t.id === sub.id)?.column === "done"
  );

  if (allDone) {
    await kanbanApi.updateTask(taskId, { column: "done", progress: 100 });
    await kanbanApi.postComment(taskId, {
      author: MAIN_AGENT_ID,
      content: "すべてのサブタスクが完了しました。",
    });
    console.log(`[${MAIN_AGENT_ID}] タスク ${taskId} を Done に移動しました`);
  }
}

async function pollAndProcess(): Promise<void> {
  const backlogTasks = await kanbanApi.listTasks("backlog");
  // 親タスク（サブタスクでないもの）だけを処理する
  const rootTasks = backlogTasks.filter((t) => t.parent_id === null);

  for (const task of rootTasks) {
    await decomposeTask(task.id);
  }
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("エラー: ANTHROPIC_API_KEY が設定されていません");
    console.error("agents/.env に ANTHROPIC_API_KEY=sk-ant-xxx を設定してください");
    process.exit(1);
  }

  console.log(`メインエージェント起動 (ポーリング間隔: ${POLL_INTERVAL_MS}ms)`);
  console.log("カンバンAPIに接続中...");

  // 起動後に一度即実行し、その後は定期実行
  await pollAndProcess();

  setInterval(async () => {
    try {
      await pollAndProcess();
    } catch (err) {
      console.error("ポーリングエラー:", err);
    }
  }, POLL_INTERVAL_MS);
}

main().catch(console.error);
