import type { Request, Response } from "express";
import { handleChat } from "./chat.service";
import { getMessages } from "./chat.db";
import type { ChatRequestBody } from "./chat.types";

export async function chatController(
  req: Request<{}, {}, ChatRequestBody>,
  res: Response,
): Promise<void> {
  const reply = await handleChat(req.body);
  res.json({ reply });
}

export function getMessagesController(
  req: Request<{ conversation_id: string }>,
  res: Response,
): void {
  const messages = getMessages(req.params.conversation_id);
  res.json(messages);
}
