import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentThread } from "../../components/CommentThread";
import { createMockComment } from "../fixtures/mockData";

vi.mock("../../api/client");
import { taskApi } from "../../api/client";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// CommentThread を特定の taskId でレンダリングするヘルパー
function renderCommentThread(taskId: string) {
  return render(<CommentThread taskId={taskId} />);
}

describe("CommentThread — 初期状態", () => {
  it("マウント時にテキストエリアが空である", async () => {
    vi.mocked(taskApi.listComments).mockResolvedValue([]);

    renderCommentThread("task-1");

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    expect(textarea).toHaveValue("");
  });

  it("マウント時に送信ボタンが無効(inputText が空のため)", async () => {
    vi.mocked(taskApi.listComments).mockResolvedValue([]);

    renderCommentThread("task-1");

    const button = screen.getByRole("button", { name: "送信" });
    expect(button).toBeDisabled();
  });

  it("マウント時に投稿者名がデフォルト値(田中)である", async () => {
    vi.mocked(taskApi.listComments).mockResolvedValue([]);

    renderCommentThread("task-1");

    const authorInput = screen.getByPlaceholderText("投稿者名");
    expect(authorInput).toHaveValue("田中");
  });
});

describe("CommentThread — AC-1: タスク切り替え時に入力欄がリセットされる", () => {
  it("[AC-1] 別の taskId で再マウントするとテキストエリアは空になる", async () => {
    vi.mocked(taskApi.listComments).mockResolvedValue([]);

    const user = userEvent.setup();
    const { rerender, unmount } = renderCommentThread("task-A");

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    await user.type(textarea, "未送信のテキスト");
    expect(textarea).toHaveValue("未送信のテキスト");

    // タスクBへの切り替えを再マウントで表現(Board では key={selectedTask.id} により再マウントが起きる)
    unmount();
    render(<CommentThread taskId="task-B" />);

    const newTextarea = screen.getByPlaceholderText("コメントを入力...");
    expect(newTextarea).toHaveValue("");
  });
});

describe("CommentThread — AC-2: 同一タスクの再マウントでも入力欄がリセットされる", () => {
  it("[AC-2] 同じ taskId で再マウントするとテキストエリアは空になる", async () => {
    vi.mocked(taskApi.listComments).mockResolvedValue([]);

    const user = userEvent.setup();
    const { unmount } = renderCommentThread("task-A");

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    await user.type(textarea, "入力途中のテキスト");
    expect(textarea).toHaveValue("入力途中のテキスト");

    // 同じ taskId で再マウント
    unmount();
    render(<CommentThread taskId="task-A" />);

    const newTextarea = screen.getByPlaceholderText("コメントを入力...");
    expect(newTextarea).toHaveValue("");
  });
});

describe("CommentThread — AC-3: 送信完了後に再マウントしても入力欄が空になる", () => {
  it("[AC-3] コメント送信完了後に再マウントするとテキストエリアは空になる", async () => {
    const user = userEvent.setup();
    vi.mocked(taskApi.listComments).mockResolvedValue([]);
    vi.mocked(taskApi.addComment).mockResolvedValue(createMockComment({ task_id: "task-A" }));

    const { unmount } = renderCommentThread("task-A");

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    await user.type(textarea, "送信するコメント");

    const button = screen.getByRole("button", { name: "送信" });
    await user.click(button);

    // 送信完了後は inputText が空になっていることを確認
    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });

    // タスクBへ切り替え後、タスクAに戻る(再マウント)
    unmount();
    render(<CommentThread taskId="task-B" />);
    const taskBTextarea = screen.getByPlaceholderText("コメントを入力...");
    expect(taskBTextarea).toHaveValue("");

    // タスクAに再度戻る
    // (unmount/remountで新インスタンスが生成されるので初期値は空)
    const { unmount: unmountB } = render(<CommentThread taskId="task-A" />);
    const taskATextarea = screen.getAllByPlaceholderText("コメントを入力...")[1];
    expect(taskATextarea).toHaveValue("");
    unmountB();
  });
});

describe("CommentThread — AC-4: 空の状態で切り替えても空のまま", () => {
  it("[AC-4] 何も入力せず再マウントしたときも入力欄は空のまま", async () => {
    vi.mocked(taskApi.listComments).mockResolvedValue([]);

    const { unmount } = renderCommentThread("task-A");

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    expect(textarea).toHaveValue("");

    unmount();
    render(<CommentThread taskId="task-B" />);

    const newTextarea = screen.getByPlaceholderText("コメントを入力...");
    expect(newTextarea).toHaveValue("");
  });
});

describe("CommentThread — AC-5: コメント一覧はタスクごとに独立している", () => {
  it("[AC-5] タスクBにマウント時はタスクBのコメントのみ表示される", async () => {
    const commentA = createMockComment({
      id: "comment-A",
      task_id: "task-A",
      content: "タスクAのコメント",
    });
    const commentB = createMockComment({
      id: "comment-B",
      task_id: "task-B",
      content: "タスクBのコメント",
    });

    vi.mocked(taskApi.listComments).mockResolvedValueOnce([commentA]);

    const { unmount } = renderCommentThread("task-A");

    await waitFor(() => {
      expect(screen.getByText("タスクAのコメント")).toBeInTheDocument();
    });

    unmount();

    vi.mocked(taskApi.listComments).mockResolvedValueOnce([commentB]);
    render(<CommentThread taskId="task-B" />);

    await waitFor(() => {
      expect(screen.getByText("タスクBのコメント")).toBeInTheDocument();
    });

    expect(screen.queryByText("タスクAのコメント")).not.toBeInTheDocument();
  });
});

describe("CommentThread — エッジケース", () => {
  it("[Edge] isSubmitting=true の状態から再マウントすると isSubmitting は false で初期化される", async () => {
    const user = userEvent.setup();

    // addComment を解決しない Promise でブロックし、送信中状態を作る
    let resolveAddComment!: (value: ReturnType<typeof createMockComment>) => void;
    vi.mocked(taskApi.listComments).mockResolvedValue([]);
    vi.mocked(taskApi.addComment).mockReturnValue(
      new Promise((resolve) => {
        resolveAddComment = resolve;
      })
    );

    const { unmount } = renderCommentThread("task-A");

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    await user.type(textarea, "送信中テキスト");

    const button = screen.getByRole("button", { name: "送信" });
    await user.click(button);

    // 送信ボタンが無効になっている(isSubmitting=true を確認する代替チェック)
    expect(button).toBeDisabled();

    // 送信中にタスクを切り替える(再マウント)
    unmount();
    resolveAddComment(createMockComment());

    vi.mocked(taskApi.listComments).mockResolvedValue([]);
    render(<CommentThread taskId="task-B" />);

    // 新しいインスタンスの送信ボタンは初期状態(inputText="" なので disabled)
    const newButton = screen.getByRole("button", { name: "送信" });
    const newTextarea = screen.getByPlaceholderText("コメントを入力...");
    expect(newTextarea).toHaveValue("");
    // inputText が空なので送信ボタンは disabled(isSubmitting=false かつ inputText="" の初期化)
    expect(newButton).toBeDisabled();
  });

  it("[Edge] 連続して複数のタスクを切り替えた後、最後のタスクの入力欄は空になっている", async () => {
    const user = userEvent.setup();
    vi.mocked(taskApi.listComments).mockResolvedValue([]);

    const { unmount: unmount1 } = renderCommentThread("task-1");
    const ta1 = screen.getByPlaceholderText("コメントを入力...");
    await user.type(ta1, "テキスト1");
    unmount1();

    const { unmount: unmount2 } = render(<CommentThread taskId="task-2" />);
    const ta2 = screen.getByPlaceholderText("コメントを入力...");
    await user.type(ta2, "テキスト2");
    unmount2();

    const { unmount: unmount3 } = render(<CommentThread taskId="task-3" />);
    const ta3 = screen.getByPlaceholderText("コメントを入力...");
    await user.type(ta3, "テキスト3");
    unmount3();

    render(<CommentThread taskId="task-4" />);
    const ta4 = screen.getByPlaceholderText("コメントを入力...");
    // 最後に表示されたタスクの入力欄は空(初期化されている)
    expect(ta4).toHaveValue("");
  });

  it("[Edge] 投稿者名はデフォルト値にリセットされる(再マウント時)", async () => {
    const user = userEvent.setup();
    vi.mocked(taskApi.listComments).mockResolvedValue([]);

    const { unmount } = renderCommentThread("task-A");

    const authorInput = screen.getByPlaceholderText("投稿者名");
    await user.clear(authorInput);
    await user.type(authorInput, "カスタム名前");
    expect(authorInput).toHaveValue("カスタム名前");

    unmount();
    render(<CommentThread taskId="task-B" />);

    const newAuthorInput = screen.getByPlaceholderText("投稿者名");
    // 再マウント後はデフォルト値(田中)に戻っている
    expect(newAuthorInput).toHaveValue("田中");
  });

  it("[Edge] コメント一覧の再フェッチと入力欄のリセットが競合しない", async () => {
    const commentB = createMockComment({
      id: "comment-B",
      task_id: "task-B",
      content: "タスクBのコメント",
    });

    vi.mocked(taskApi.listComments).mockResolvedValueOnce([]);
    const { unmount } = renderCommentThread("task-A");
    unmount();

    vi.mocked(taskApi.listComments).mockResolvedValueOnce([commentB]);
    render(<CommentThread taskId="task-B" />);

    // コメント一覧が正しく表示される
    await waitFor(() => {
      expect(screen.getByText("タスクBのコメント")).toBeInTheDocument();
    });

    // 入力欄は空のまま
    const textarea = screen.getByPlaceholderText("コメントを入力...");
    expect(textarea).toHaveValue("");
  });
});

describe("CommentThread — 非機能要件", () => {
  it("Ctrl+Enter でコメントを送信できる", async () => {
    const user = userEvent.setup();
    vi.mocked(taskApi.listComments).mockResolvedValue([]);
    vi.mocked(taskApi.addComment).mockResolvedValue(createMockComment());

    renderCommentThread("task-1");

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    await user.type(textarea, "ショートカット送信");
    await user.keyboard("{Control>}{Enter}{/Control}");

    await waitFor(() => {
      expect(taskApi.addComment).toHaveBeenCalledTimes(1);
    });

    // 送信後は入力欄が空になる
    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  it("Meta+Enter(Cmd+Enter) でコメントを送信できる", async () => {
    const user = userEvent.setup();
    vi.mocked(taskApi.listComments).mockResolvedValue([]);
    vi.mocked(taskApi.addComment).mockResolvedValue(createMockComment());

    renderCommentThread("task-1");

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    await user.type(textarea, "Cmdショートカット送信");
    await user.keyboard("{Meta>}{Enter}{/Meta}");

    await waitFor(() => {
      expect(taskApi.addComment).toHaveBeenCalledTimes(1);
    });
  });
});
