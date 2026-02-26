/**
 * Message converter
 * Converts PromptMessage to LLM message format
 */

import type { PromptMessage, LLMMessage } from "../types";

/**
 * Converts PromptMessage to LLM message format
 */
export function promptToMessages(prompt: PromptMessage): LLMMessage[] {
  return [
    { role: "system", content: prompt.system },
    {
      role: "user",
      content: prompt.contextBlock + "\n\n" + prompt.user,
    },
  ];
}
