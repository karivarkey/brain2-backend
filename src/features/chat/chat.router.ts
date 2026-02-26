import { Router } from "express";
import { chatController, getMessagesController } from "./chat.controller";
import { dashboardController } from "./dashboard.controller";

const router = Router();

router.post("/chat", chatController);
router.get("/chat/:conversation_id", getMessagesController);
router.get("/dashboard", dashboardController);

export default router;
