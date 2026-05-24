import { Response } from "express";

type SSEClient = {
  id: string;
  response: Response;
};

const clients: Map<string, SSEClient> = new Map();

export function addSSEClient(id: string, response: Response): void {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders();

  // 接続確立を通知
  sendToClient(response, "connected", { clientId: id });

  clients.set(id, { id, response });

  response.on("close", () => {
    clients.delete(id);
  });
}

export function broadcast(eventName: string, data: unknown): void {
  const deadClients: string[] = [];

  for (const [id, client] of clients) {
    try {
      sendToClient(client.response, eventName, data);
    } catch {
      deadClients.push(id);
    }
  }

  for (const id of deadClients) {
    clients.delete(id);
  }
}

function sendToClient(
  response: Response,
  eventName: string,
  data: unknown
): void {
  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}
