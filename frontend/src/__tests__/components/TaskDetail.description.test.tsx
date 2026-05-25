import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskDetail } from "../../components/TaskDetail";
import { createMockTask } from "../fixtures/mockData";
import { taskApi } from "../../api/client";

vi.mock("../../api/client");
vi.mock("../../components/CommentThread", () => ({
  CommentThread: () => <div data-testid="comment-thread" />,
}));

const defaultProps = {
  subtasks: [],
  onClose: vi.fn(),
  onTaskUpdated: vi.fn(),
  onTaskDeleted: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(taskApi.listComments).mockResolvedValue([]);
});

// ────────────────────────────────────────────────────────────────────────────
// AC-1: 説明が空のとき「説明を追加...」プレースホルダーが表示される
// ────────────────────────────────────────────────────────────────────────────
describe("[AC-1] 説明が空のとき「説明を追加...」プレースホルダーを表示", () => {
  it("説明が空文字のタスクでプレースホルダーテキストが表示される", () => {
    const task = createMockTask({ description: "" });
    render(<TaskDetail {...defaultProps} task={task} />);

    expect(screen.getByText("説明を追加...")).toBeInTheDocument();
  });

  it("説明が null/undefined 扱いのタスクでもプレースホルダーが表示される", () => {
    // description は型上 string だが空文字を渡す
    const task = createMockTask({ description: "" });
    render(<TaskDetail {...defaultProps} task={task} />);

    expect(screen.getByText("説明を追加...")).toBeInTheDocument();
  });

  it("プレースホルダーはクリック可能な要素として表示される（cursor-pointer）", () => {
    const task = createMockTask({ description: "" });
    render(<TaskDetail {...defaultProps} task={task} />);

    const placeholder = screen.getByText("説明を追加...");
    expect(placeholder.tagName.toLowerCase()).toBe("p");
    expect(placeholder.className).toContain("cursor-pointer");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC-2: 空の説明エリアをクリックすると編集モードに切り替わる
// ────────────────────────────────────────────────────────────────────────────
describe("[AC-2] 空の説明エリアをクリックすると編集モードに切り替わる", () => {
  it("プレースホルダーをクリックするとテキストエリアが表示される", async () => {
    const task = createMockTask({ description: "" });
    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("説明を追加..."));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "" })).toBeInTheDocument();
    });
  });

  it("プレースホルダーをクリックするとテキストエリアの初期値が空である", async () => {
    const task = createMockTask({ description: "" });
    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("説明を追加..."));

    const textarea = await screen.findByRole("textbox", { hidden: false });
    // 説明テキストエリアを特定するため保存ボタンが存在することも確認
    expect(screen.getAllByRole("button", { name: "保存" }).length).toBeGreaterThan(0);

    // 編集用テキストエリアを特定する
    const textareas = screen.getAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => el.tagName === "TEXTAREA" && (el as HTMLTextAreaElement).value === ""
    );
    expect(descriptionTextarea).toBeDefined();
    expect((descriptionTextarea as HTMLTextAreaElement).value).toBe("");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC-3: 説明が入力済みのとき、クリックで既存値がセットされた編集モードに切り替わる
// ────────────────────────────────────────────────────────────────────────────
describe("[AC-3] 説明が入力済みのとき既存値がセットされた編集モードに切り替わる", () => {
  it("説明テキストをクリックするとテキストエリアが表示される", async () => {
    const task = createMockTask({ description: "既存の説明文" });
    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("既存の説明文"));

    await waitFor(() => {
      const textareas = screen.getAllByRole("textbox");
      const descriptionTextarea = textareas.find(
        (el) => (el as HTMLTextAreaElement).value === "既存の説明文"
      );
      expect(descriptionTextarea).toBeDefined();
    });
  });

  it("テキストエリアに既存の説明文が入力値として設定されている", async () => {
    const task = createMockTask({ description: "既存の説明文" });
    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("既存の説明文"));

    const textareas = await screen.findAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => (el as HTMLTextAreaElement).value === "既存の説明文"
    );
    expect((descriptionTextarea as HTMLTextAreaElement).value).toBe("既存の説明文");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC-4: 「保存」ボタン押下で PATCH API が呼ばれ、編集モードが終了する
// ────────────────────────────────────────────────────────────────────────────
describe("[AC-4] 「保存」ボタン押下で PATCH API が呼ばれる", () => {
  it("保存ボタン押下で taskApi.update が正しい引数で呼ばれる", async () => {
    const task = createMockTask({ id: "task-1", description: "" });
    const updatedTask = createMockTask({ id: "task-1", description: "新しい説明" });
    vi.mocked(taskApi.update).mockResolvedValueOnce(updatedTask);

    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("説明を追加..."));

    const textareas = screen.getAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => el.tagName === "TEXTAREA" && (el as HTMLTextAreaElement).value === ""
    )!;
    await userEvent.type(descriptionTextarea, "新しい説明");

    // 説明セクションの保存ボタンをクリック
    const saveButtons = screen.getAllByRole("button", { name: "保存" });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(taskApi.update).toHaveBeenCalledWith("task-1", { description: "新しい説明" });
    });
  });

  it("保存成功後に編集モードが終了してテキストエリアが消える", async () => {
    const task = createMockTask({ id: "task-1", description: "" });
    const updatedTask = createMockTask({ id: "task-1", description: "新しい説明" });
    vi.mocked(taskApi.update).mockResolvedValueOnce(updatedTask);

    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("説明を追加..."));

    const textareas = screen.getAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => el.tagName === "TEXTAREA" && (el as HTMLTextAreaElement).value === ""
    )!;
    await userEvent.type(descriptionTextarea, "新しい説明");

    const saveButtons = screen.getAllByRole("button", { name: "保存" });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      // 編集モードが終了するとテキストエリアが消える
      const remainingTextareas = screen.queryAllByRole("textbox");
      const descEditArea = remainingTextareas.find(
        (el) => el.tagName === "TEXTAREA" && (el as HTMLTextAreaElement).value === "新しい説明"
      );
      expect(descEditArea).toBeUndefined();
    });
  });

  it("保存成功後に onTaskUpdated コールバックが呼ばれる", async () => {
    const task = createMockTask({ id: "task-1", description: "" });
    const updatedTask = createMockTask({ id: "task-1", description: "新しい説明" });
    const onTaskUpdated = vi.fn();
    vi.mocked(taskApi.update).mockResolvedValueOnce(updatedTask);

    render(<TaskDetail {...defaultProps} task={task} onTaskUpdated={onTaskUpdated} />);

    fireEvent.click(screen.getByText("説明を追加..."));

    const textareas = screen.getAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => el.tagName === "TEXTAREA" && (el as HTMLTextAreaElement).value === ""
    )!;
    await userEvent.type(descriptionTextarea, "新しい説明");

    const saveButtons = screen.getAllByRole("button", { name: "保存" });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(onTaskUpdated).toHaveBeenCalledWith(updatedTask);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC-5: Ctrl+Enter キーで保存が実行される
// ────────────────────────────────────────────────────────────────────────────
describe("[AC-5] Ctrl+Enter キーで保存が実行される", () => {
  it("Ctrl+Enter キー押下で taskApi.update が呼ばれる", async () => {
    const task = createMockTask({ id: "task-1", description: "既存の説明" });
    const updatedTask = createMockTask({ id: "task-1", description: "変更した説明" });
    vi.mocked(taskApi.update).mockResolvedValueOnce(updatedTask);

    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("既存の説明"));

    const textareas = screen.getAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => (el as HTMLTextAreaElement).value === "既存の説明"
    )!;

    // 内容を変更して Ctrl+Enter
    fireEvent.change(descriptionTextarea, { target: { value: "変更した説明" } });
    fireEvent.keyDown(descriptionTextarea, { key: "Enter", ctrlKey: true });

    await waitFor(() => {
      expect(taskApi.update).toHaveBeenCalledWith("task-1", { description: "変更した説明" });
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC-6: 「キャンセル」ボタン押下で編集を破棄し、API を呼ばない
// ────────────────────────────────────────────────────────────────────────────
describe("[AC-6] 「キャンセル」ボタン押下で編集を破棄する", () => {
  it("キャンセルボタン押下で編集モードが終了する", async () => {
    const task = createMockTask({ description: "元の説明" });
    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("元の説明"));

    await waitFor(() => {
      expect(screen.queryAllByRole("button", { name: "キャンセル" }).length).toBeGreaterThan(0);
    });

    const cancelButtons = screen.getAllByRole("button", { name: "キャンセル" });
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    await waitFor(() => {
      expect(screen.queryByText("元の説明")).toBeInTheDocument();
    });
  });

  it("キャンセル後 API は呼ばれない", async () => {
    const task = createMockTask({ description: "元の説明" });
    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("元の説明"));

    const textareas = screen.getAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => (el as HTMLTextAreaElement).value === "元の説明"
    )!;
    fireEvent.change(descriptionTextarea, { target: { value: "変更したが捨てる" } });

    const cancelButtons = screen.getAllByRole("button", { name: "キャンセル" });
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    expect(taskApi.update).not.toHaveBeenCalled();
  });

  it("説明が空のタスクでキャンセルするとプレースホルダーに戻る", async () => {
    const task = createMockTask({ description: "" });
    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("説明を追加..."));

    const cancelButtons = await screen.findAllByRole("button", { name: "キャンセル" });
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText("説明を追加...")).toBeInTheDocument();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC-7: Escape キーで編集を破棄する
// ────────────────────────────────────────────────────────────────────────────
describe("[AC-7] Escape キーで編集を破棄する", () => {
  it("Escape キー押下で編集モードが終了して変更が破棄される", async () => {
    const task = createMockTask({ description: "元の説明" });
    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("元の説明"));

    const textareas = screen.getAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => (el as HTMLTextAreaElement).value === "元の説明"
    )!;
    fireEvent.change(descriptionTextarea, { target: { value: "変更したが捨てる" } });
    fireEvent.keyDown(descriptionTextarea, { key: "Escape" });

    await waitFor(() => {
      expect(screen.getByText("元の説明")).toBeInTheDocument();
    });
    expect(taskApi.update).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC-8: 保存リクエスト進行中はテキストエリアと保存・キャンセルボタンが disabled
// ────────────────────────────────────────────────────────────────────────────
describe("[AC-8] 保存リクエスト進行中は disabled になる", () => {
  it("保存中はテキストエリアが disabled になる", async () => {
    const task = createMockTask({ id: "task-1", description: "既存の説明" });
    // resolve しない Promise で「進行中」状態を維持
    vi.mocked(taskApi.update).mockReturnValueOnce(new Promise(() => {}));

    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("既存の説明"));

    const textareas = screen.getAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => (el as HTMLTextAreaElement).value === "既存の説明"
    )!;
    // 変更を加えて保存ボタンをクリック
    fireEvent.change(descriptionTextarea, { target: { value: "変更後" } });

    const saveButtons = screen.getAllByRole("button", { name: "保存" });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      const textareasAfter = screen.getAllByRole("textbox");
      const editingTextarea = textareasAfter.find(
        (el) => el.tagName === "TEXTAREA" && (el as HTMLTextAreaElement).value === "変更後"
      );
      expect(editingTextarea).toBeDefined();
      expect(editingTextarea as HTMLTextAreaElement).toBeDisabled();
    });
  });

  it("保存中は保存ボタンが disabled になる", async () => {
    const task = createMockTask({ id: "task-1", description: "既存の説明" });
    vi.mocked(taskApi.update).mockReturnValueOnce(new Promise(() => {}));

    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("既存の説明"));

    const textareas = screen.getAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => (el as HTMLTextAreaElement).value === "既存の説明"
    )!;
    fireEvent.change(descriptionTextarea, { target: { value: "変更後" } });

    const saveButtonsBefore = screen.getAllByRole("button", { name: "保存" });
    fireEvent.click(saveButtonsBefore[saveButtonsBefore.length - 1]);

    await waitFor(() => {
      const saveButtonsAfter = screen.getAllByRole("button", { name: "保存" });
      expect(saveButtonsAfter[saveButtonsAfter.length - 1]).toBeDisabled();
    });
  });

  it("保存中はキャンセルボタンが disabled になる", async () => {
    const task = createMockTask({ id: "task-1", description: "既存の説明" });
    vi.mocked(taskApi.update).mockReturnValueOnce(new Promise(() => {}));

    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("既存の説明"));

    const textareas = screen.getAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => (el as HTMLTextAreaElement).value === "既存の説明"
    )!;
    fireEvent.change(descriptionTextarea, { target: { value: "変更後" } });

    const saveButtons = screen.getAllByRole("button", { name: "保存" });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      const cancelButtonsAfter = screen.getAllByRole("button", { name: "キャンセル" });
      expect(cancelButtonsAfter[cancelButtonsAfter.length - 1]).toBeDisabled();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC-9: API エラー時に編集モードを維持してエラーメッセージを表示
// ────────────────────────────────────────────────────────────────────────────
describe("[AC-9] API エラー時に編集モードを維持してエラーメッセージを表示", () => {
  it("保存失敗時に編集モードが維持される（テキストエリアが残る）", async () => {
    const task = createMockTask({ id: "task-1", description: "既存の説明" });
    vi.mocked(taskApi.update).mockRejectedValueOnce(new Error("Internal Server Error"));

    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("既存の説明"));

    const textareas = screen.getAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => (el as HTMLTextAreaElement).value === "既存の説明"
    )!;
    fireEvent.change(descriptionTextarea, { target: { value: "変更後" } });

    const saveButtons = screen.getAllByRole("button", { name: "保存" });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      const textareasAfter = screen.getAllByRole("textbox");
      const editingTextarea = textareasAfter.find(
        (el) => el.tagName === "TEXTAREA" && (el as HTMLTextAreaElement).value === "変更後"
      );
      expect(editingTextarea).toBeDefined();
    });
  });

  it("保存失敗時にエラーメッセージが表示される", async () => {
    const task = createMockTask({ id: "task-1", description: "既存の説明" });
    vi.mocked(taskApi.update).mockRejectedValueOnce(new Error("サーバーエラー"));

    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("既存の説明"));

    const textareas = screen.getAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => (el as HTMLTextAreaElement).value === "既存の説明"
    )!;
    fireEvent.change(descriptionTextarea, { target: { value: "変更後" } });

    const saveButtons = screen.getAllByRole("button", { name: "保存" });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText("サーバーエラー")).toBeInTheDocument();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// エッジケース: 空文字列に変更して保存
// ────────────────────────────────────────────────────────────────────────────
describe("[エッジケース] 空文字列に変更して保存", () => {
  it("説明を空文字列に変更して保存すると API に空文字列が送信される", async () => {
    const task = createMockTask({ id: "task-1", description: "既存の説明" });
    const updatedTask = createMockTask({ id: "task-1", description: "" });
    vi.mocked(taskApi.update).mockResolvedValueOnce(updatedTask);

    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("既存の説明"));

    const textareas = screen.getAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => (el as HTMLTextAreaElement).value === "既存の説明"
    )!;
    fireEvent.change(descriptionTextarea, { target: { value: "" } });

    const saveButtons = screen.getAllByRole("button", { name: "保存" });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(taskApi.update).toHaveBeenCalledWith("task-1", { description: "" });
    });
  });

  it("空文字列での保存成功後にプレースホルダーが表示される", async () => {
    const task = createMockTask({ id: "task-1", description: "既存の説明" });
    const updatedTask = createMockTask({ id: "task-1", description: "" });
    vi.mocked(taskApi.update).mockResolvedValueOnce(updatedTask);
    const onTaskUpdated = vi.fn();

    render(<TaskDetail {...defaultProps} task={task} onTaskUpdated={onTaskUpdated} />);

    fireEvent.click(screen.getByText("既存の説明"));

    const textareas = screen.getAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => (el as HTMLTextAreaElement).value === "既存の説明"
    )!;
    fireEvent.change(descriptionTextarea, { target: { value: "" } });

    const saveButtons = screen.getAllByRole("button", { name: "保存" });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(onTaskUpdated).toHaveBeenCalledWith(updatedTask);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// エッジケース: 変更なしで保存すると API を呼ばない
// ────────────────────────────────────────────────────────────────────────────
describe("[エッジケース] 変更なしで保存すると API を呼ばない", () => {
  it("同じ内容のまま保存ボタンを押すと taskApi.update が呼ばれない", async () => {
    const task = createMockTask({ id: "task-1", description: "変わらない説明" });

    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("変わらない説明"));

    // テキストを変更せずにそのまま保存
    const saveButtons = screen.getAllByRole("button", { name: "保存" });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      // 編集モードが終了する
      const textareasAfter = screen.queryAllByRole("textbox");
      const editingTextarea = textareasAfter.find(
        (el) => (el as HTMLTextAreaElement).value === "変わらない説明"
      );
      expect(editingTextarea).toBeUndefined();
    });

    expect(taskApi.update).not.toHaveBeenCalledWith("task-1", expect.objectContaining({ description: expect.anything() }));
  });

  it("同じ内容のまま Ctrl+Enter でも API は呼ばれない", async () => {
    const task = createMockTask({ id: "task-1", description: "変わらない説明" });

    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("変わらない説明"));

    const textareas = screen.getAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => (el as HTMLTextAreaElement).value === "変わらない説明"
    )!;
    fireEvent.keyDown(descriptionTextarea, { key: "Enter", ctrlKey: true });

    await waitFor(() => {
      const textareasAfter = screen.queryAllByRole("textbox");
      const editingTextarea = textareasAfter.find(
        (el) => (el as HTMLTextAreaElement).value === "変わらない説明"
      );
      expect(editingTextarea).toBeUndefined();
    });

    expect(taskApi.update).not.toHaveBeenCalledWith("task-1", expect.objectContaining({ description: expect.anything() }));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// エッジケース: 非常に長いテキスト入力時のテキストエリアのスタイル
// ────────────────────────────────────────────────────────────────────────────
describe("[エッジケース] 長いテキスト入力時のテキストエリアスタイル", () => {
  it("テキストエリアに max-h と overflow-y-auto クラスが設定されている", async () => {
    const task = createMockTask({ description: "" });
    render(<TaskDetail {...defaultProps} task={task} />);

    fireEvent.click(screen.getByText("説明を追加..."));

    const textareas = await screen.findAllByRole("textbox");
    const descriptionTextarea = textareas.find(
      (el) => el.tagName === "TEXTAREA" && (el as HTMLTextAreaElement).value === ""
    )!;

    expect(descriptionTextarea.className).toContain("max-h-");
    expect(descriptionTextarea.className).toContain("overflow-y-auto");
  });
});
