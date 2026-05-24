/**
 * サブエージェント — 単一のサブタスクを担当して処理するエージェント
 *
 * メインエージェントから呼び出される。
 * サブタスクのIDを受け取り、そのタスクを処理して完了させる。
 */

import Anthropic from "@anthropic-ai/sdk";
import { KANBAN_TOOLS, executeTool } from "./tools.js";
import { kanbanApi } from "./kanban-client.js";

const client = new Anthropic();

// フォーク先でカスタマイズできるシステムプロンプト
// config/agent-config.json から読み込む実装に差し替え可能
const SUB_AGENT_SYSTEM_PROMPT = `
あなたはサブエージェントです。割り当てられたサブタスクを1つ担当して処理します。

## あなたの動き方
1. get_tasks でサブタスクの現在の状態を確認する
2. update_task でカラムを "in-progress" に変更し、進捗を 0% にセットする
3. タスクの内容に応じて処理を進める（progress を定期的に更新する）
4. 人間の確認が必要なら move_to_waiting を呼ぶ
5. 完了したら update_task で column を "done"、progress を 100% にする

## 注意事項
- 処理中は current_step に今何をしているかを日本語で書く
- エラーが起きたら error フィールドに内容を書いてカラムを backlog に戻す
- 完了後に post_comment で完了報告を書く
`.trim();

export async function runSubAgent(params: {
  agentId: string;
  taskId: string;
}): Promise<void> {
  const { agentId, taskId } = params;

  console.log(`[${agentId}] サブタスク ${taskId} の処理を開始`);

  // エージェントIDを担当タスクにセットする
  await kanbanApi.updateTask(taskId, { assigned_agent: agentId });

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `サブタスク ID: ${taskId} を処理してください。まず get_tasks でタスクの内容を確認し、処理を進めてください。`,
    },
  ];

  // ツールを使い終わるまでループ
  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SUB_AGENT_SYSTEM_PROMPT,
      tools: KANBAN_TOOLS,
      messages,
    });

    // アシスタントのメッセージを会話履歴に追加
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      console.log(`[${agentId}] サブタスク ${taskId} 完了`);
      break;
    }

    if (response.stop_reason !== "tool_use") break;

    // ツール呼び出しを実行する
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      console.log(`[${agentId}] ツール実行: ${block.name}`);

      try {
        const result = await executeTool(
          block.name,
          block.input as Record<string, unknown>,
          agentId
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
}
