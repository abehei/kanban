import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../server";

// SSE emitter をモック化
vi.mock("../../sse/emitter", () => ({
  broadcast: vi.fn(),
  addSSEClient: vi.fn(),
  removeSSEClient: vi.fn(),
}));

// DB をテスト用インメモリDBに差し替え
vi.mock("../../db/database", async () => {
  const actual = await vi.importActual<typeof import("../../db/database")>("../../db/database");
  const testDb = actual.createTestDatabase();
  return {
    ...actual,
    getDatabase: () => testDb,
  };
});

const app = createApp();

describe("GET /api/tasks", () => {
  it("空のDBでは空配列を返す", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("POST /api/tasks", () => {
  it("titleを指定してタスクを作成できる", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ title: "新しいタスク" });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("新しいタスク");
    expect(res.body.id).toBeDefined();
    expect(res.body.column).toBe("backlog");
  });

  it("titleが空の場合は400を返す", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ title: "" });
    expect(res.status).toBe(400);
  });

  it("titleがない場合は400を返す", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/tasks/:id", () => {
  it("存在しないIDで404を返す", async () => {
    const res = await request(app).get("/api/tasks/nonexistent-id");
    expect(res.status).toBe(404);
  });

  it("作成したタスクを取得できる", async () => {
    const created = await request(app)
      .post("/api/tasks")
      .send({ title: "取得テスト" });
    const res = await request(app).get(`/api/tasks/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("取得テスト");
  });
});

describe("PATCH /api/tasks/:id", () => {
  it("titleを更新できる", async () => {
    const created = await request(app)
      .post("/api/tasks")
      .send({ title: "更新前" });
    const res = await request(app)
      .patch(`/api/tasks/${created.body.id}`)
      .send({ title: "更新後" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("更新後");
  });

  it("columnを更新できる", async () => {
    const created = await request(app)
      .post("/api/tasks")
      .send({ title: "カラム変更テスト" });
    const res = await request(app)
      .patch(`/api/tasks/${created.body.id}`)
      .send({ column: "in-progress" });
    expect(res.status).toBe(200);
    expect(res.body.column).toBe("in-progress");
  });

  it("存在しないIDで404を返す", async () => {
    const res = await request(app)
      .patch("/api/tasks/nonexistent")
      .send({ title: "更新" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/tasks/:id", () => {
  it("タスクを削除できる", async () => {
    const created = await request(app)
      .post("/api/tasks")
      .send({ title: "削除テスト" });
    const res = await request(app).delete(`/api/tasks/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it("削除後はGETで404を返す", async () => {
    const created = await request(app)
      .post("/api/tasks")
      .send({ title: "削除後確認" });
    await request(app).delete(`/api/tasks/${created.body.id}`);
    const res = await request(app).get(`/api/tasks/${created.body.id}`);
    expect(res.status).toBe(404);
  });

  it("存在しないIDで404を返す", async () => {
    const res = await request(app).delete("/api/tasks/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/tasks/:id/comments", () => {
  it("コメントを投稿できる", async () => {
    const task = await request(app)
      .post("/api/tasks")
      .send({ title: "コメントテスト用タスク" });
    const res = await request(app)
      .post(`/api/tasks/${task.body.id}/comments`)
      .send({ author: "テストユーザー", content: "テストコメント" });
    expect(res.status).toBe(201);
    expect(res.body.content).toBe("テストコメント");
  });
});
