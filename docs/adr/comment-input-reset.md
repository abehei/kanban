# ADR: コメント入力欄のタスク切り替え時リセット

- 仕様: docs/specs/comment-input-reset.md
- 状態: Proposed

## コンテキスト

`TaskDetail` パネルでタスクを切り替えたとき、コメント入力欄（テキストエリア・投稿者名・`isSubmitting` フラグ）が前のタスクの状態を保持したまま表示されるバグが存在する。

根本原因は `Board.tsx` の以下の箇所にある。

```tsx
<TaskDetail
  task={selectedTask}
  subtasks={...}
  ...
/>
```

`TaskDetail` に `key` prop がないため、`selectedTask` が別のタスクに変わっても React は同一コンポーネントインスタンスを再利用する。結果として `CommentThread` の内部 state（`inputText`, `authorName`, `isSubmitting`）がリセットされない。

また `CommentThread` 側では `useEffect` が `taskId` 変化に追従してコメント一覧を再フェッチするが、入力フィールドのリセットは行われていない。

解くべき技術的問題は「`taskId` が変わったときに `CommentThread` の入力 state を確実に初期値へ戻す」ことであり、方法として大きく「コンポーネント再マウント」と「`useEffect` による明示的リセット」の2方向がある。

## 検討した選択肢

### 案A: `TaskDetail` に `key={task.id}` を付与する（再マウント方式）

- 概要: `Board.tsx` の `<TaskDetail key={selectedTask.id} ...>` とするだけで、タスク切り替えのたびに `TaskDetail` ツリー全体がアンマウント→マウントされ、`CommentThread` 含むすべての state が自動的に初期値に戻る。
- 利点:
  - 変更箇所が `Board.tsx` の1行のみ
  - `CommentThread` 本体を一切修正しない
  - 将来 `TaskDetail` 内に追加される入力系コンポーネントも自動的に恩恵を受ける
  - React の公式推奨パターン（「異なるエンティティには異なる key を与える」）と一致する
  - `isSubmitting` 含む全 state が確実にリセットされる
- 欠点:
  - `TaskDetail` 全体が再マウントされるため、コメント一覧の初期フェッチが毎回走る（ただし既存コードでも `taskId` 変化時に `useEffect` で再フェッチしているため実質差分なし）
  - タスクタイトル編集中などの状態も同時にリセットされる（仕様の「out of scope」に明記されているため問題なし）

### 案B: `CommentThread` 内で `useEffect` によるリセット処理を追加する（明示的リセット方式）

- 概要: `CommentThread.tsx` に `useEffect(() => { setInputText(""); setAuthorName("田中"); setIsSubmitting(false); }, [taskId])` を追加する。
- 利点:
  - `TaskDetail` の他 state（タイトル編集など）に一切影響しない
  - 再マウントによるパフォーマンスコストがない
- 欠点:
  - `taskId` 変化とリセットの間に1レンダリングサイクルのラグが生じるため、高速切り替え時に一瞬古い入力値が見える可能性がある
  - 将来 `CommentThread` に入力フィールドが増えた場合、`useEffect` の更新漏れが発生しやすい
  - 仕様の AC-2「同一タスクを再度開いたときもリセット」を満たすには、`selectedTask` の open/close トリガーを `CommentThread` に伝播する別の仕組みが必要になる（`key` なし・同一 `taskId` では `useEffect` が再実行されない）
  - state の初期値（`"田中"` など）がコンポーネント初期化ロジックと `useEffect` の2か所に重複する

## 決定

**採用: 案A（`TaskDetail` に `key={task.id}` を付与する）**

理由:

1. 変更コストが最小（Board.tsx の1行）であり、バグの根本原因（React によるコンポーネント再利用）を直接解消する。
2. 案Bは AC-2（同一タスクの再オープン時リセット）を「`key` なし」では達成できず、追加の仕組みが必要になる。案Aは AC-2 を構造的に満たす。
3. React の設計思想「同一の `key` = 同一エンティティ、異なる `key` = 別エンティティ」に沿っており、将来の開発者が直感的に理解できる。
4. コメント一覧の再フェッチは既存動作と同等であり、体感パフォーマンスへの影響は軽微。

## 影響範囲

- 新規作成するファイル/モジュール: なし
- 変更するファイル/モジュール:
  - `frontend/src/components/Board.tsx` — `<TaskDetail>` に `key={selectedTask.id}` を追加（1行変更）
- 影響を受ける既存機能:
  - タスク切り替え時に `TaskDetail` 全体が再マウントされる。これにより思考ログの開閉状態・サブタスク編集中状態・タイトル編集中状態もリセットされるが、いずれも仕様の out of scope かつユーザー体験上許容範囲。

## データモデル

変更なし。

## 公開API

変更なし。`TaskDetail` のプロップス型 (`TaskDetailProps`) は変わらない。`key` は React の予約 prop であり型定義に現れない。

## リスク

| リスク | 発生条件 | 緩和策 |
|---|---|---|
| コメント一覧の再フェッチによるちらつき | ネットワーク遅延が大きい環境でタスクを切り替えた瞬間 | 既存コードの `loadComments` は同様のタイミングで呼ばれており現状と同等。必要であれば将来的にローカルキャッシュを導入する |
| `taskId` が重複する不正データ | サブタスクが親と同じ `id` を持つ場合 | DB スキーマで `id` は PRIMARY KEY（一意性保証済み） |
| 送信中にタスク切り替えで API 呼び出しが宙ぶらりになる | `isSubmitting=true` 中に別タスクへ切り替え | コンポーネントアンマウント後は `setIsSubmitting` の呼び出しが無視される（React の警告は出ない）。必要であれば `AbortController` を導入するが、仕様のエッジケースで許容されている |
