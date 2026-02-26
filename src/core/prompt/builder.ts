/**
 * Prompt builder
 * Constructs the system + context + user message for LLM injection
 */

import type { ContextBlock, PromptMessage } from "../types";
import { formatContextBlock } from "../context";
import { SYSTEM_PROMPT } from "./templates";

/**
 * Gets current date and time in a formatted string
 */
function getCurrentDateTime(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateStr} at ${timeStr}`;
}

/**
 * Builds the three-part prompt structure for LLM injection
 * Keeps injection points explicit and prevents prompt injection attacks
 */
export function buildPrompt(
  userMessage: string,
  contextBlock: ContextBlock,
): PromptMessage {
  const contextBlockStr = formatContextBlock(contextBlock);
  const currentDateTime = getCurrentDateTime();

  // Inject current date/time into system prompt
  const systemPromptWithDateTime = `CURRENT DATE & TIME: ${currentDateTime}

${SYSTEM_PROMPT}`;

  return {
    system: systemPromptWithDateTime,
    contextBlock: contextBlockStr,
    user: userMessage,
  };
}
