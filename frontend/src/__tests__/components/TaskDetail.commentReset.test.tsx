/**
 * タスク切り替え時のコメント入力欄リセット — 統合テスト
 *
 * Board では <TaskDetail key={selectedTask.id} ... /> のように key を付けることで
 * タスク切り替え時に TaskDetail(とその内部の CommentThread)が再マウントされる。
 * このファイルでは TaskDetail + CommentThread の組み合わせで上記挙動を検証する。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskDetail } from "../../components/TaskDetail";
import { createMockTask, createMockComment } from "../fixtures/mockData";

vi.mock("../../api/client");
import { taskApi } from "../../api/client";

// window.confirm は TaskDetail 内の削除処理で使われる
vi.stubGlobal("confirm", vi.fn(() => false));

const taskA = createMockTask({ id: "task-A", title: "タスクA" });
const taskB = createMockTask({ id: "task-B", title: "タスクB" });

function renderTaskDetail(task: ReturnType<typeof createMockTask>) {
  return render(
    <TaskDetail
      key={task.id}
      task={task}
      subtasks={[]}
      onClose={vi.fn()}
      onTaskUpdated={vi.fn()}
      onTaskDeleted={vi.fn()}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(taskApi.listComments).mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("TaskDetail + CommentThread — タスク切り替え時のコメント入力欄リセット", () => {
  it("[AC-1] タスクAで入力中に別タスクBへ切り替えるとテキストエリアは空になる", async () => {
    const user = userEvent.setup();

    const { unmount } = renderTaskDetail(taskA);

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    await user.type(textarea, "未送信のテキスト");
    expect(textarea).toHaveValue("未送信のテキスト");

    // Board では key={selectedTask.id} により TaskDetail が再マウントされる
    unmount();
    renderTaskDetail(taskB);

    const newTextarea = screen.getByPlaceholderText("コメントを入力...");
    expect(newTextarea).toHaveValue("");
  });

  it("[AC-2] 同じタスクAで再マウントするとテキストエリアは空になる", async () => {
    const user = userEvent.setup();

    const { unmount } = renderTaskDetail(taskA);

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    await user.type(textarea, "入力途中のテキスト");
    expect(textarea).toHaveValue("入力途中のテキスト");

    // 同じ taskId だが Board では再クリックで再マウントが起きる
    unmount();
    renderTaskDetail(taskA);

    const newTextarea = screen.getByPlaceholderText("コメントを入力...");
    expect(newTextarea).toHaveValue("");
  });

  it("[AC-3] タスクBへ切り替え後にタスクAへ戻ってもコメント入力欄は空", async () => {
    const user = userEvent.setup();
    vi.mocked(taskApi.addComment).mockResolvedValue(createMockComment({ task_id: "task-A" }));

    const { unmount: unmountA1 } = renderTaskDetail(taskA);

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    await user.type(textarea, "送信するコメント");
    const button = screen.getByRole("button", { name: "送信" });
    await user.click(button);

    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });

    // タスクBへ切り替え
    unmountA1();
    const { unmount: unmountB } = renderTaskDetail(taskB);
    const textareaB = screen.getByPlaceholderText("コメントを入力...");
    expect(textareaB).toHaveValue("");

    // タスクAに戻る
    unmountB();
    renderTaskDetail(taskA);
    const textareaA2 = screen.getByPlaceholderText("コメントを入力...");
    expect(textareaA2).toHaveValue("");
  });

  it("[AC-4] 空の状態でタスクBに切り替えても入力欄は空のまま", async () => {
    const { unmount } = renderTaskDetail(taskA);

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    expect(textarea).toHaveValue("");

    unmount();
    renderTaskDetail(taskB);

    const newTextarea = screen.getByPlaceholderText("コメントを入力...");
    expect(newTextarea).toHaveValue("");
  });

  it("[AC-5] タスクBに切り替えるとタスクB固有のコメントのみ表示される", async () => {
    const commentA = createMockComment({
      id: "c-A",
      task_id: "task-A",
      content: "タスクAのコメント",
    });
    const commentB = createMockComment({
      id: "c-B",
      task_id: "task-B",
      content: "タスクBのコメント",
    });

    vi.mocked(taskApi.listComments).mockResolvedValueOnce([commentA]);
    const { unmount } = renderTaskDetail(taskA);

    await waitFor(() => {
      expect(screen.getByText("タスクAのコメント")).toBeInTheDocument();
    });

    unmount();

    vi.mocked(taskApi.listComments).mockResolvedValueOnce([commentB]);
    renderTaskDetail(taskB);

    await waitFor(() => {
      expect(screen.getByText("タスクBのコメント")).toBeInTheDocument();
    });

    // タスクAのコメントは表示されていない
    expect(screen.queryByText("タスクAのコメント")).not.toBeInTheDocument();
  });

  it("[Edge] isSubmitting 中にタスク切り替えをすると新タスクの入力欄は空・非送信中で初期化される", async () => {
    const user = userEvent.setup();

    let resolveAddComment!: (value: ReturnType<typeof createMockComment>) => void;
    vi.mocked(taskApi.addComment).mockReturnValue(
      new Promise((resolve) => {
        resolveAddComment = resolve;
      })
    );

    const { unmount } = renderTaskDetail(taskA);

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    await user.type(textarea, "送信中テキスト");
    const button = screen.getByRole("button", { name: "送信" });
    await user.click(button);

    // 送信中状態: ボタンが disabled
    expect(button).toBeDisabled();

    // 送信中にタスク切り替え
    unmount();
    resolveAddComment(createMockComment());

    vi.mocked(taskApi.listComments).mockResolvedValue([]);
    renderTaskDetail(taskB);

    const newTextarea = screen.getByPlaceholderText("コメントを入力...");
    expect(newTextarea).toHaveValue("");

    // 新しいテキストエリアに何も入力していないので送信ボタンは disabled のまま
    // (isSubmitting=false かつ inputText="" の初期状態を確認)
    const newButton = screen.getByRole("button", { name: "送信" });
    expect(newButton).toBeDisabled();
  });

  it("[Edge] 投稿者名もデフォルト値(田中)にリセットされる", async () => {
    const user = userEvent.setup();

    const { unmount } = renderTaskDetail(taskA);

    const authorInput = screen.getByPlaceholderText("投稿者名");
    await user.clear(authorInput);
    await user.type(authorInput, "別の名前");
    expect(authorInput).toHaveValue("別の名前");

    unmount();
    renderTaskDetail(taskB);

    const newAuthorInput = screen.getByPlaceholderText("投稿者名");
    expect(newAuthorInput).toHaveValue("田中");
  });
});
