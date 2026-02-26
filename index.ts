import express from "express";
import cors from "cors";
import chatRouter from "./src/features/chat/chat.router";
import memoryRouter from "./src/features/memory/memory.router";
import reminderRouter from "./src/features/reminder/reminder.router";
import { reminderScheduler } from "./src/features/reminder/reminder.scheduler";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/", chatRouter);
app.use("/api", memoryRouter);
app.use("/api", reminderRouter);

// Start the reminder scheduler
reminderScheduler.start();

app.listen(3000, () => {
  console.log("Server running on port 3000");
  console.log("⏰ Reminder scheduler is active");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down gracefully...");
  reminderScheduler.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down gracefully...");
  reminderScheduler.stop();
  process.exit(0);
});
