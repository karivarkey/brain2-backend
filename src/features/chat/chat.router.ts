import { Router } from "express";
import { chatController, getMessagesController } from "./chat.controller";

const router = Router();

router.post("/chat", chatController);
router.get("/get_messages/:conversation_id", getMessagesController);

export default router;
