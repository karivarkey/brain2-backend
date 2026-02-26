import { insertMessage, getSessionState, upsertSessionState } from "./chat.db";

import type { ChatRequestBody, SessionState } from "./chat.types";

import {
  buildContext,
  buildPrompt,
  promptToMessages,
  streamWithMutationCapture,
} from "../../core";

import { GeminiProvider } from "../../providers";
import { summarizeConversation } from "../../providers";

const TOKEN_THRESHOLD = 50_000;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const provider = new GeminiProvider({
  apiKey: process.env.GEMINI_API_KEY!,
  modelId: "gemini-2.0-flash",
});

export async function handleChat(body: ChatRequestBody): Promise<string> {
  const { conversation_id, message } = body;

  insertMessage(conversation_id, "user", message);

  let state: SessionState | null = getSessionState(conversation_id);

  if (!state) {
    state = {
      conversation_id,
      summary_text: "",
      raw_buffer: [],
      token_estimate: 0,
    };
  }

  state.raw_buffer.push({ role: "user", content: message });
  state.token_estimate += estimateTokens(message);

  if (state.token_estimate > TOKEN_THRESHOLD) {
    const newSummary = await summarizeConversation(
      state.summary_text,
      state.raw_buffer,
    );

    state.summary_text = newSummary;
    state.raw_buffer = [];
    state.token_estimate = estimateTokens(newSummary);
  }

  const enrichedMessage = `
SESSION SUMMARY:
${state.summary_text}

RECENT:
${state.raw_buffer.map((m) => `${m.role}: ${m.content}`).join("\n")}

USER:
${message}
`.trim();

  const context = await buildContext([]);

  const prompt = buildPrompt(enrichedMessage, context);
  const messages = promptToMessages(prompt);

  let reply = "";

  await streamWithMutationCapture(provider, messages, {
    memoryDir: "./memory",
    onToken: (token) => {
      reply += token;
    },
  });

  insertMessage(conversation_id, "assistant", reply);

  state.raw_buffer.push({ role: "assistant", content: reply });
  state.token_estimate += estimateTokens(reply);

  upsertSessionState(state);

  return reply;
}
