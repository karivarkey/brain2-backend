import { insertMessage, getSessionState, upsertSessionState } from "./chat.db";

import { existsSync } from "fs";
import { join } from "path";

import type { ChatRequestBody, SessionState } from "./chat.types";

import {
  applyMemoryMutation,
  buildContext,
  buildPrompt,
  promptToMessages,
  streamWithMutationCapture,
} from "../../core";
import type { MemoryMutation } from "../../core";

import { GeminiProvider } from "../../providers";
import { summarizeConversation } from "../../providers";
import { MemoryStore } from "../../lib/memory_store";

const TOKEN_THRESHOLD = 50_000;
const MEMORY_DIR = "./memory";

// Global memory store instance - shared across all conversations
const memoryStore = new MemoryStore({
  memoryDir: MEMORY_DIR,
  topK: 6, // Retrieve top 6 relevant memory files
});

function shouldAutoRemember(message: string): boolean {
  const hasRemember = /\bremember\b/i.test(message);
  const hasDate =
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i.test(
      message,
    );
  const hasNumericDate = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(message);
  const hasTime = /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i.test(message);

  return hasRemember && (hasDate || hasNumericDate || hasTime);
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function inferEventFile(message: string): string {
  if (/\bchennai\b/i.test(message)) return "chennai_trip";
  if (/\bflight\b|\btravel\b|\btrip\b|\bleav(e|ing)\b/i.test(message)) {
    return "travel_event";
  }

  return "schedule_event";
}

function buildAutoEventMutation(message: string): MemoryMutation {
  const file = inferEventFile(message);
  const filePath = join(MEMORY_DIR, `${file}.md`);
  const exists = existsSync(filePath);
  const today = getTodayDate();

  return {
    action: exists ? "update" : "create",
    file,
    changes: {
      metadata: exists
        ? { last_updated: today }
        : {
            id: file,
            type: "event",
            related_entities: [],
            emotional_intensity: 0.4,
            stress_flag: true,
            last_updated: today,
          },
      append: `\n## Description\n${message}\n\n## Emotional Impact\nNot specified.\n\n## Lasting Effects\nNot specified.\n`,
    },
  };
}

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

  // Search global memory using JUST the user message
  // (enrichedMessage is too long for embedding endpoint - causes 500 error)
  console.log(`🔍 Searching memory for: "${message}"`);
  const searchResults = await memoryStore.search(message);
  console.log(
    `📚 Found ${searchResults.length} relevant memory files:`,
    searchResults.map((r) => `${r.file} (${r.score.toFixed(3)})`).join(", "),
  );

  // Build context from search results
  // This dynamically updates on EVERY query, adding/removing files based on relevance
  const context = await buildContext(searchResults, MEMORY_DIR, 6);

  console.log(`📦 Context built with ${context.entries.length} files:`);
  context.entries.forEach((entry) => {
    console.log(
      `   - ${entry.filename} (score: ${entry.score.toFixed(3)}, ${entry.content.length} chars)`,
    );
  });

  const prompt = buildPrompt(enrichedMessage, context);
  const messages = promptToMessages(prompt);

  console.log(
    `📨 Sending to Gemini - User message length: ${messages[1]?.content.length} chars`,
  );
  console.log(`\n📋 FULL CONTEXT BEING SENT TO GEMINI:`);
  console.log("━".repeat(80));
  console.log(messages[1]?.content);
  console.log("━".repeat(80));
  console.log();

  let reply = "";

  let mutationApplied = false;

  await streamWithMutationCapture(provider, messages, {
    memoryDir: MEMORY_DIR,
    onToken: (token) => {
      reply += token;
    },
    onMemoryMutation: async (mutation) => {
      mutationApplied = true;
      console.log(
        `🔄 Refreshing index after mutation: ${mutation.action} ${mutation.file}`,
      );
      await memoryStore.refreshIndex();
      console.log(`✅ Index refreshed - new memories are now searchable`);
    },
  });

  if (!mutationApplied && shouldAutoRemember(message)) {
    const mutation = buildAutoEventMutation(message);
    console.log(
      `🧠 Auto-saving schedule memory: ${mutation.action} ${mutation.file}`,
    );
    applyMemoryMutation(mutation, MEMORY_DIR);
    await memoryStore.refreshIndex();
    console.log(`✅ Index refreshed - new memories are now searchable`);
  }

  console.log(`\n💬 Gemini's visible response (${reply.length} chars):`);
  console.log(`"${reply}"`);
  console.log();

  insertMessage(conversation_id, "assistant", reply);

  state.raw_buffer.push({ role: "assistant", content: reply });
  state.token_estimate += estimateTokens(reply);

  upsertSessionState(state);

  return reply;
}
