/**
 * Prompt builder
 * Constructs the system + context + user message for LLM injection
 */

import type { ContextBlock, PromptMessage } from "../types";
import { formatContextBlock } from "../context";
import { SYSTEM_PROMPT } from "./templates";

/**
 * Builds the three-part prompt structure for LLM injection
 * Keeps injection points explicit and prevents prompt injection attacks
 */
export function buildPrompt(
  userMessage: string,
  contextBlock: ContextBlock,
): PromptMessage {
  const contextBlockStr = formatContextBlock(contextBlock);

  return {
    system: SYSTEM_PROMPT,
    contextBlock: contextBlockStr,
    user: userMessage,
  };
}
