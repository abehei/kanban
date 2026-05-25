# ADR: タスク説明のインライン編集

- 仕様: docs/specs/task-description-edit.md
- 状態: Proposed

## コンテキスト

TaskDetail パネルでは `task.description` が空のとき説明エリア自体が非表示になるため、
タスク作成後に説明を追記する手段がない。
バックエンドの `PATCH /api/tasks/:id` は既に `description` フィールドの更新を受け付けており、
`taskApi.update()` も `description` を型として許容している。
不足しているのはフロントエンドの編集 UI のみである。

同じ TaskDetail.tsx には既に「タイトルのインライン編集」と「サブタスクのインライン編集」が
同一パターン（state + textarea + 保存/キャンセルボタン + Escape キー）で実装されている。
この機能をどのパターンで追加するかが設計上の判断点となる。

## 検討した選択肢

### 案A: TaskDetail.tsx に直接インライン編集ロジックを追加（既存パターンの踏襲）

- 概要: タイトル編集・サブタスク編集と同じく、TaskDetail.tsx に `isEditingDescription`
  / `editingDescriptionValue` / `isSavingDescription` / `descriptionError` の state と
  対応するハンドラ関数を追加し、JSX 内の説明エリアを表示/編集モードで切り替える。
- 利点:
  - 既存コードと構造が完全に一致し、コードレビューコストが低い
  - 新規ファイルが不要でディレクトリ構成を変えない
  - `task` props と `onTaskUpdated` コールバックへのアクセスが直接でき、余分な prop drilling がない
  - `taskApi.update()` / `onTaskUpdated` の呼び出し方がタイトル編集と完全に同じ
- 欠点:
  - TaskDetail.tsx がさらに肥大化する（現在 371 行 → 約 420 行程度）
  - description 専用のエラー state が増え、タイトル編集のエラー表示がない現状との非対称が生じる

### 案B: DescriptionEditor コンポーネントとして分離

- 概要: `frontend/src/components/DescriptionEditor.tsx` を新規作成し、
  編集 state・ハンドラ・JSX をそこに集約する。TaskDetail.tsx はコンポーネントを呼び出すだけにする。
- 利点:
  - TaskDetail.tsx の行数増加を最小限に抑えられる
  - description 編集ロジックが単体でテスト可能
  - 将来的にサブタスクの description 編集などに再利用できる
- 欠点:
  - `task.id`・`task.description`・`onTaskUpdated` を props として渡す必要があり、
    インターフェース設計の手間が増える
  - 現時点では TaskDetail.tsx 以外から使う予定がなく、過剰な抽象化になりやすい
  - タイトル編集・サブタスク編集が分離されていない既存方針と一貫性が取れない

## 決定

**採用: 案A**

理由:
タイトル編集・サブタスク編集はいずれも TaskDetail.tsx 内にインラインで実装されており、
コードベースの一貫性を最優先とする。
現時点で DescriptionEditor を再利用する予定がなく、
コンポーネント分離による複雑性増加がメリットを上回らない。
行数の増加は許容範囲内であり、仕様に定義された全 AC（AC-1〜AC-9）を
既存パターンの延長で実装できる。

## 影響範囲

- 新規作成するファイル/モジュール: なし
- 変更するファイル/モジュール:
  - `frontend/src/components/TaskDetail.tsx`
    - state 追加: `isEditingDescription`, `editingDescriptionValue`, `isSavingDescription`, `descriptionError`
    - ハンドラ追加: `handleDescriptionEditStart`, `handleDescriptionSave`, `handleDescriptionCancel`, `handleDescriptionKeyDown`
    - JSX 変更: 説明エリア（現在の `{task.description && (...)}` ブロック）を
      常時表示 + 表示/編集モード切り替えに置き換える
- 影響を受ける既存機能:
  - タイトル編集・サブタスク編集は変更なし
  - `taskApi.update()` / バックエンド `PATCH /api/tasks/:id` は変更なし

## データモデル

追加する state の型（コンポーネントローカル）:

```typescript
const [isEditingDescription, setIsEditingDescription] = useState(false);
const [editingDescriptionValue, setEditingDescriptionValue] = useState("");
const [isSavingDescription, setIsSavingDescription] = useState(false);
const [descriptionError, setDescriptionError] = useState<string | null>(null);
```

型定義の変更は不要。`Task.description` は既に `string` 型として定義済み。

## 公開API

バックエンド・`taskApi` の変更なし。

既存の呼び出し:

```typescript
taskApi.update(task.id, { description: editingDescriptionValue })
```

保存成功後: `onTaskUpdated(updated)` を呼び出してパネルを更新する（タイトル編集と同じ）。

## リスク

| リスク | 緩和策 |
|---|---|
| 説明が変更なしのまま保存ボタンを押して不要な API リクエストが発生する | `editingDescriptionValue === task.description` の場合は API を呼ばずに編集モードを終了する（仕様エッジケースに明記） |
| 空文字列保存後に description が null ではなく `""` になり表示が崩れる | 保存後のレスポンスで `task.description` が `""` のとき、プレースホルダー表示に切り替える（表示条件を `task.description` の truthy 判定から変更する） |
| 長大テキストでテキストエリアが画面外に広がる | `max-h-48 overflow-y-auto resize-none` などで高さ上限を設ける（仕様非機能要件に準拠） |
| エージェント処理中に description を上書き保存すると競合が起きる | 仕様のスコープ外。ユーザーへの警告も今回は行わない。競合制御は別 ADR に委ねる |
