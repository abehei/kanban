# Agent Kanban — Claude Code 向け指示書

このファイルはClaude Codeが作業するときに参照する指示書です。

## プロジェクトの目的

人間とClaudeエージェントが協働するカンバンボードの**テンプレートリポジトリ**。
各プロジェクトでこのリポジトリをフォークして使う。

## リポジトリ構成

```
kanban/
├── frontend/    React + Vite + TypeScript（カンバンUI）
├── backend/     Express.js + TypeScript（REST API + SSE）
├── agents/      Claudeエージェントのサンプル実装
└── config/      フォーク先でカスタマイズする設定ファイル
```

## 技術スタック

| レイヤー | 使うもの |
|---|---|
| UI | React 18 + Vite + TypeScript |
| スタイル | Tailwind CSS |
| DnD | @dnd-kit/core + @dnd-kit/sortable |
| API | Express.js + TypeScript |
| DB | SQLite (better-sqlite3) |
| リアルタイム | SSE (Server-Sent Events) |
| エージェント | @anthropic-ai/sdk |

## コーディング規約

### 共通
- TypeScript strict mode。`any` は使わない
- `async/await` を使う。Promiseチェーンは書かない
- 変数・関数名は役割がわかる名前にする（`d`, `tmp` 禁止）
- 1関数は1つのことだけ行う（目安30行以内）

### フロントエンド
- 関数コンポーネント + hooks のみ（class component 禁止）
- スタイルは Tailwind CSS のクラスで書く（別途CSSファイルは作らない）
- 1コンポーネント = 1ファイル
- 型定義は `frontend/src/types/index.ts` に集約する

### バックエンド
- エラーは必ずtry/catchでハンドリングし、適切なHTTPステータスを返す
- SSEイベントはすべて `backend/src/sse/emitter.ts` を経由して発火する

### コメント
- 「なぜそう書いたか」が自明でない場合のみ書く
- 「何をしているか」の説明コメントは書かない（コードで表現する）

## APIエンドポイント

```
GET    /api/tasks               タスク一覧（?column=backlog などでフィルタ可）
POST   /api/tasks               タスク作成
GET    /api/tasks/:id           タスク詳細
PATCH  /api/tasks/:id           タスク更新
DELETE /api/tasks/:id           タスク削除
POST   /api/tasks/:id/subtasks  サブタスク追加
GET    /api/tasks/:id/comments  コメント一覧
POST   /api/tasks/:id/comments  コメント投稿
GET    /api/events              SSEストリーム
```

## SSEイベント

タスク/コメントのCRUD後に必ず対応するSSEイベントを発火すること。

| イベント名 | データ |
|---|---|
| `task:created` | Task オブジェクト |
| `task:updated` | Task オブジェクト |
| `task:deleted` | `{ id: string }` |
| `comment:added` | Comment オブジェクト |
| `agent:status` | `{ agentId, status, step? }` |

## 型定義（共通）

主要な型は `frontend/src/types/index.ts` で定義し、
バックエンドも同じ型定義を参照する（コピーではなく共通化する）。

## フォーク先でカスタマイズできる箇所

`config/` ディレクトリ内のファイルを上書きする:
- `columns.json` — カラムの定義・順序
- `agent-config.json` — モデル名・システムプロンプト・最大トークン
- `approval-gates.json` — 承認ゲートの発動条件

## 開発サーバーの起動

```bash
npm install              # 全workspaceの依存を一括インストール
npm run dev              # frontend + backend を同時起動
npm run start:agents     # エージェント起動（agents/.env が必要）
```
