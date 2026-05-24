import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import tasksRouter from "./routes/tasks";
import eventsRouter from "./routes/events";

const PORT = process.env.PORT ?? 3001;

// データ保存用ディレクトリを起動前に作成する
const dataDir = path.join(__dirname, "../../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api/tasks", tasksRouter);
app.use("/api/events", eventsRouter);

// 未キャッチのエラーを HTML でなく JSON で返す
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? "内部サーバーエラー" });
});

app.listen(PORT, () => {
  console.log(`バックエンドサーバー起動: http://localhost:${PORT}`);
});
