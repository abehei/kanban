# 開発に参加する方へ（CONTRIBUTING）

このドキュメントは人間の開発者向けです。コードの書き方・PRの出し方・ブランチ戦略をまとめています。

---

## セットアップ

```bash
# 1. リポジトリをクローン（またはフォーク）
git clone https://github.com/your-org/agent-kanban.git
cd agent-kanban

# 2. 依存パッケージをインストール（全workspaceまとめて）
npm install

# 3. 環境変数を設定
cp .env.example agents/.env
# agents/.env を開いて ANTHROPIC_API_KEY を入力する

# 4. 開発サーバーを起動
npm run dev
# → フロントエンド: http://localhost:5173
# → バックエンド:   http://localhost:3001
```

---

## ブランチ戦略

| ブランチ名 | 用途 |
|---|---|
| `main` | 本番リリース用。直接コミット禁止 |
| `develop` | 開発の統合ブランチ |
| `feature/xxx` | 新機能の開発 |
| `fix/xxx` | バグ修正 |
| `chore/xxx` | ライブラリ更新・設定変更など |

---

## PRの出し方

1. `develop` ブランチから作業ブランチを切る
2. 変更を加えてコミットする
3. `develop` へのPRを作成する
4. レビュワーを1名以上アサインする
5. CIが通ったらレビュワーがマージする

---

## コミットメッセージの書き方

```
<タイプ>: <変更内容の要約>

<詳細説明（任意）>
```

**タイプの一覧:**

| タイプ | 意味 |
|---|---|
| `feat` | 新機能の追加 |
| `fix` | バグ修正 |
| `refactor` | 機能変更を伴わないコード改善 |
| `docs` | ドキュメントの変更 |
| `chore` | ビルド・依存関係・設定の変更 |
| `test` | テストの追加・修正 |

**例:**
```
feat: タスクカードにサブタスク数を表示する

完了/全体のサブタスク数（例: 2/5）をカードに追加。
進捗バーと合わせて確認できるようにした。
```

---

## 命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| Reactコンポーネント | PascalCase | `TaskCard`, `BoardColumn` |
| 関数・変数 | camelCase | `handleDrop`, `selectedTask` |
| 定数 | UPPER_SNAKE_CASE | `MAX_TASK_TITLE_LENGTH` |
| ファイル（コンポーネント） | PascalCase + `.tsx` | `TaskCard.tsx` |
| ファイル（その他） | camelCase + `.ts` | `useSSE.ts`, `client.ts` |
| APIルート | kebab-case | `/api/tasks/:id/sub-tasks` |

---

## コードの書き方の方針

- **読みやすさ優先**: 後から読む人が迷わないコードを書く
- **1関数1責務**: 長くなったら小さな関数に分割する（目安: 30行以内）
- **名前で意図を伝える**: `d`, `tmp`, `data` のような曖昧な名前は使わない
- **コメントは「なぜ」を書く**: 「何をしているか」はコード自体で伝える

---

## フォーク先でカスタマイズする箇所

`config/` ディレクトリ内のファイルを上書きするだけで、以下を変更できます:

| ファイル | カスタマイズできること |
|---|---|
| `config/columns.json` | カラムの名前・順序・色 |
| `config/agent-config.json` | 使うClaudeモデル・システムプロンプト |
| `config/approval-gates.json` | 人間の承認が必要になる条件 |

---

## APIキーの管理

**絶対にAPIキーをGitHubにコミットしないでください。**

- `agents/.env` にAPIキーを書く → `.gitignore` で除外済み → GitHubに上がらない
- `.env.example` はキー名のみ（値なし）なのでGitHubに上げてOK

```bash
# 正しい使い方
cp .env.example agents/.env
# agents/.env に実際のキーを書く（このファイルはコミットしない）
```
