import { Router } from "express";
import { chatController, getMessagesController } from "./chat.controller";

const router = Router();

router.post("/chat", chatController);
router.get("/chat/:conversation_id", getMessagesController);

export default router;
