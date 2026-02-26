/**
 * Prompt builder
 * Constructs the system + context + user message for LLM injection
 */

import type { ContextBlock, PromptMessage } from "../types";
import { formatContextBlock } from "../context";
import { SYSTEM_PROMPT } from "./templates";

/**
 * Gets current date and time in both UTC and user's timezone
 */
function getCurrentDateTime(timezone: string = "UTC"): string {
  const now = new Date();

  // UTC time
  const utcStr = now.toISOString();

  // User's local time
  const localDateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  });
  const localTimeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: timezone,
  });

  return `${localDateStr} at ${localTimeStr} (${timezone})
UTC Time: ${utcStr}`;
}

/**
 * Builds the three-part prompt structure for LLM injection
 * Keeps injection points explicit and prevents prompt injection attacks
 */
export function buildPrompt(
  userMessage: string,
  contextBlock: ContextBlock,
  timezone: string = "UTC",
): PromptMessage {
  const contextBlockStr = formatContextBlock(contextBlock);
  const currentDateTime = getCurrentDateTime(timezone);

  // Inject current date/time into system prompt
  const systemPromptWithDateTime = `CURRENT DATE & TIME: ${currentDateTime}

${SYSTEM_PROMPT}`;

  return {
    system: systemPromptWithDateTime,
    contextBlock: contextBlockStr,
    user: userMessage,
  };
}
