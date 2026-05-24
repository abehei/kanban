/**
 * モックエージェント — APIキー不要のローカル動作確認用
 *
 * 実際のClaude APIは呼ばず、タスクの分解・進捗更新・完了を
 * タイマーでシミュレートする。カンバンUIの動作確認に使う。
 */

import { kanbanApi } from "./kanban-client.js";

const POLL_INTERVAL_MS = 3000;
const STEP_INTERVAL_MS = 1500;

// タスクの内容から、それらしいサブタスクを生成するシンプルなロジック
function generateSubtasks(taskTitle: string): Array<{ title: string; description: string }> {
  const keyword = taskTitle.toLowerCase();

  if (keyword.includes("ページ") || keyword.includes("ui") || keyword.includes("デザイン") || keyword.includes("改善")) {
    return [
      { title: "現状の問題点を調査・整理する", description: "既存のUIやコピーの課題を洗い出す" },
      { title: "改善案を設計・ドラフトする", description: "複数の改善パターンを検討し、最良案を選ぶ" },
      { title: "実装・変更を加える", description: "選定した改善案をコードに反映する" },
      { title: "動作確認・レビューを行う", description: "変更が意図通り動いているか確認する" },
    ];
  }

  if (keyword.includes("バグ") || keyword.includes("修正") || keyword.includes("fix")) {
    return [
      { title: "バグの再現手順を確認する", description: "どの条件で発生するか特定する" },
      { title: "原因を調査する", description: "コードやログを追いかけて根本原因を特定する" },
      { title: "修正を実装する", description: "原因を取り除くコードを書く" },
      { title: "テスト・動作確認をする", description: "修正後も他の機能に影響がないか確認する" },
    ];
  }

  if (keyword.includes("機能") || keyword.includes("実装") || keyword.includes("追加")) {
    return [
      { title: "要件・仕様を整理する", description: "何を作るか明確にする" },
      { title: "設計・アーキテクチャを決める", description: "どう実装するかを設計する" },
      { title: "実装する", description: "設計に基づいてコードを書く" },
      { title: "テストを書いて動作確認する", description: "正しく動くことを確認する" },
    ];
  }

  // デフォルト: 汎用サブタスク
  return [
    { title: "調査・情報収集を行う", description: "必要な情報を集めて整理する" },
    { title: "計画・方針を立てる", description: "進め方を決める" },
    { title: "実行する", description: "計画に沿って作業を進める" },
    { title: "確認・完了処理をする", description: "結果を確認して締める" },
  ];
}

// サブタスクを1件ずつ順番に処理する（並列ではなく順番にして見やすくする）
async function processSubtask(subtaskId: string, agentId: string): Promise<void> {
  const steps = [
    { step: "調査・確認中...", progress: 20 },
    { step: "作業を進めています...", progress: 50 },
    { step: "仕上げ・検証中...", progress: 80 },
    { step: "完了", progress: 100 },
  ];

  await kanbanApi.updateTask(subtaskId, {
    column: "in-progress",
    assigned_agent: agentId,
    progress: 0,
    current_step: "開始しました",
  });

  for (const { step, progress } of steps) {
    await sleep(STEP_INTERVAL_MS);
    await kanbanApi.updateTask(subtaskId, { current_step: step, progress });
  }

  await kanbanApi.updateTask(subtaskId, { column: "done", progress: 100 });
  await kanbanApi.postComment(subtaskId, {
    author: agentId,
    content: "サブタスクを完了しました。",
  });
}

async function processTask(taskId: string, taskTitle: string): Promise<void> {
  console.log(`\n[main-agent] タスク処理開始: "${taskTitle}"`);

  // In Progress に移動してエージェント名をセット
  await kanbanApi.updateTask(taskId, {
    column: "in-progress",
    assigned_agent: "main-agent",
    current_step: "タスクを分析してサブタスクに分解中...",
    progress: 5,
  });

  await kanbanApi.postComment(taskId, {
    author: "main-agent",
    content: "タスクを受け取りました。サブタスクに分解して処理を開始します。",
  });

  await sleep(STEP_INTERVAL_MS);

  // サブタスクを生成してカンバンに登録
  const subtaskDefs = generateSubtasks(taskTitle);
  console.log(`[main-agent] ${subtaskDefs.length}件のサブタスクを作成`);

  const createdSubtaskIds: string[] = [];
  for (const def of subtaskDefs) {
    const subtask = await kanbanApi.addSubtask(taskId, {
      title: def.title,
      description: def.description,
    });
    createdSubtaskIds.push(subtask.id);
    console.log(`  + ${def.title}`);
  }

  await kanbanApi.updateTask(taskId, {
    current_step: `${subtaskDefs.length}件のサブタスクを実行中...`,
    progress: 10,
  });

  // サブタスクを順番に処理する（サブエージェントのシミュレーション）
  for (let i = 0; i < createdSubtaskIds.length; i++) {
    const agentId = `sub-agent-${i + 1}`;
    console.log(`[${agentId}] サブタスク処理中: "${subtaskDefs[i].title}"`);
    await processSubtask(createdSubtaskIds[i], agentId);

    // 親タスクの進捗を更新
    const parentProgress = Math.round(((i + 1) / createdSubtaskIds.length) * 90) + 10;
    await kanbanApi.updateTask(taskId, {
      progress: parentProgress,
      current_step: `${i + 1}/${createdSubtaskIds.length} 完了`,
    });
  }

  // 全サブタスク完了 → 親タスクも Done へ
  await kanbanApi.updateTask(taskId, {
    column: "done",
    progress: 100,
    current_step: "完了",
  });

  await kanbanApi.postComment(taskId, {
    author: "main-agent",
    content: `すべての作業が完了しました。\n\n処理したサブタスク:\n${subtaskDefs.map((s, i) => `${i + 1}. ${s.title}`).join("\n")}`,
  });

  console.log(`[main-agent] タスク完了: "${taskTitle}"`);
}

async function pollAndProcess(): Promise<void> {
  const allTasks = await kanbanApi.listTasks();
  // Backlogにある未着手の親タスクだけを処理
  // assigned_agent が設定済みのタスクは別のエージェントが処理中 → スキップ
  const pendingTasks = allTasks.filter(
    (t) => t.column === "backlog" && t.parent_id === null && !t.assigned_agent
  );

  for (const task of pendingTasks) {
    await processTask(task.id, task.title);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log("=================================");
  console.log(" モックエージェント起動");
  console.log(" APIキー不要・ローカル動作確認用");
  console.log(`=================================`);
  console.log(`バックエンド: ${process.env.KANBAN_API_URL ?? "http://localhost:3001"}`);
  console.log(`ポーリング間隔: ${POLL_INTERVAL_MS}ms\n`);

  // 起動時に即一度実行
  try {
    await pollAndProcess();
  } catch (err) {
    console.error("エラー:", err);
  }

  // 以降は定期実行
  setInterval(async () => {
    try {
      await pollAndProcess();
    } catch (err) {
      console.error("ポーリングエラー:", err);
    }
  }, POLL_INTERVAL_MS);
}

main();
