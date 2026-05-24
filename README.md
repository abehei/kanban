# Agent Kanban

人間とClaudeエージェントが協働するカンバンボードの**テンプレートリポジトリ**。  
各プロジェクトでフォークして使うことを前提とした汎用設計です。

## 機能

- 5カラムのカンバンボード（Backlog / In Progress / Waiting / Review / Done）
- タスクのドラッグ&ドロップによるカラム間移動
- 右スライドパネルによるタスク詳細表示・編集
- サブタスクのツリー表示
- コメントスレッド（人間・エージェント両対応）
- 承認ゲート（Waitingカラム）での人間の承認フロー
- SSE によるリアルタイム更新（複数タブで同期）
- Claude API（tool_use）を使ったエージェントサンプル実装

## セットアップ

```bash
# 1. リポジトリをクローン（またはフォーク）
git clone https://github.com/abehei/kanban.git
cd kanban

# 2. 依存パッケージをまとめてインストール
npm install

# 3. 開発サーバーを起動（frontend + backend 同時起動）
npm run dev
# → フロントエンド: http://localhost:5173
# → バックエンド API: http://localhost:3001
```

## エージェントを動かす

```bash
# APIキーを設定
cp .env.example agents/.env
# agents/.env を開いて ANTHROPIC_API_KEY=sk-ant-xxx を入力する

# エージェントを起動
npm run start:agents
```

起動後、Backlog にタスクを追加するとエージェントが自動で検知し、  
サブタスクへの分解・処理・進捗更新を行います。

## フォークしてカスタマイズする

`config/` ディレクトリ内のファイルを上書きするだけでカスタマイズできます:

| ファイル | カスタマイズできること |
|---|---|
| `config/columns.json` | カラムの名前・順序・色 |
| `config/agent-config.json` | 使うClaudeモデル・システムプロンプト |
| `config/approval-gates.json` | 人間の承認が必要になる条件 |

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | React 18 + Vite + TypeScript + Tailwind CSS |
| ドラッグ&ドロップ | @dnd-kit |
| バックエンド | Express.js + TypeScript |
| データベース | SQLite（better-sqlite3） |
| リアルタイム通信 | SSE（Server-Sent Events） |
| エージェント | Anthropic Claude API（tool_use） |

## ディレクトリ構成

```
kanban/
├── frontend/     Reactカンバン UI
├── backend/      REST API + SSE サーバー
├── agents/       Claudeエージェントのサンプル実装
└── config/       フォーク先でカスタマイズする設定ファイル
```

詳細は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

## ライセンス

MIT
