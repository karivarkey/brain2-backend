/**
 * Memory context building and formatting
 * Responsible for loading files and preparing context for LLM injection
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { FileSearchResult } from "./memory_store";

export interface ContextBlock {
  entries: Array<{
    filename: string;
    score: number;
    content: string;
  }>;
}

/**
 * Loads full file content from search results
 * Returns structured context block with scores attached
 */
export async function buildContext(
  searchResults: FileSearchResult[],
  memoryDir: string = "./memory",
): Promise<ContextBlock> {
  const entries = [];

  for (const result of searchResults) {
    const filePath = join(memoryDir, result.file);
    const content = readFileSync(filePath, "utf-8");

    entries.push({
      filename: result.file,
      score: result.score,
      content: content.trim(),
    });
  }

  return { entries };
}

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
