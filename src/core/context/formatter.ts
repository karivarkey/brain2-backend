/**
 * Context formatter
 * Formats context blocks into strings for LLM injection
 */

import type { ContextBlock } from "../types";

/**
 * Formats context block into a string suitable for LLM injection
 * Shows filename, relevance score, and full content
 * Prevents hallucinated edits by making all context explicit
 */
export function formatContext(context: ContextBlock): string {
  if (context.entries.length === 0) {
    return "No relevant memory found.";
  }

  return context.entries
    .map((entry) => {
      return `[FILE: ${entry.filename}]
RELEVANCE_SCORE: ${entry.score.toFixed(4)}
---
${entry.content}
---`;
    })
    .join("\n\n");
}

/**
 * Creates the context block string with header
 */
export function formatContextBlock(context: ContextBlock): string {
  const formatted = formatContext(context);
  return `MEMORY_CONTEXT:

${formatted}`;
}
