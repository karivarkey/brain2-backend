/**
 * Memory context building and formatting
 * Responsible for loading files and preparing context for LLM injection
 */

import { readFileSync, existsSync } from "fs";
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
 * Always includes user.md first if it exists
 * Can limit number of results via maxResults parameter
 */
export async function buildContext(
  searchResults: FileSearchResult[],
  memoryDir: string = "./memory",
  maxResults: number = 6,
): Promise<ContextBlock> {
  const entries = [];

  // Always include user.md first if it exists
  const userPath = join(memoryDir, "user.md");
  if (existsSync(userPath)) {
    try {
      const content = readFileSync(userPath, "utf-8");
      entries.push({
        filename: "user.md",
        score: 1.0, // Self context always scores highest
        content: content.trim(),
      });
    } catch (e) {
      console.error("Failed to load user.md:", e);
    }
  }

  // Load search results (up to maxResults-1 to account for user.md)
  const resultsToLoad = Math.min(
    searchResults.length,
    maxResults - entries.length,
  );

  for (let i = 0; i < resultsToLoad; i++) {
    const result = searchResults[i];
    if (!result) continue;

    const filePath = join(memoryDir, result.file);
    try {
      const content = readFileSync(filePath, "utf-8");
      entries.push({
        filename: result.file,
        score: result.score,
        content: content.trim(),
      });
    } catch (e) {
      console.error(`Failed to load ${result.file}:`, e);
    }
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
