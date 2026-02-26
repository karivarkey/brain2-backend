import express from "express";
import chatRouter from "./src/features/chat/chat.router";

const app = express();

app.use(express.json());
app.use("/", chatRouter);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
