import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { addSSEClient, broadcast } from "../sse/emitter";

const router = Router();

// ブラウザがここに接続し続けることでリアルタイム通知を受け取る
router.get("/", (req: Request, res: Response) => {
  const clientId = uuidv4();
  addSSEClient(clientId, res);
});

// エージェントが自分のステータスを通知する
router.post("/agent-status", (req: Request, res: Response) => {
  const { agentId, status, step } = req.body;
  if (!agentId || !status) {
    res.status(400).json({ error: "agentId と status は必須です" });
    return;
  }
  broadcast("agent:status", { agentId, status, step });
  res.status(204).send();
});

export default router;
