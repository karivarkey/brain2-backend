/**
 * Context file loader
 * Handles loading memory files from the filesystem
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { FileSearchResult } from "../types";

export interface ContextEntry {
  filename: string;
  score: number;
  content: string;
}

/**
 * Load a single memory file
 */
export function loadMemoryFile(
  filename: string,
  memoryDir: string,
): string | null {
  const filePath = join(memoryDir, filename);
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return readFileSync(filePath, "utf-8").trim();
  } catch (e) {
    console.error(`Failed to load ${filename}:`, e);
    return null;
  }
}

/**
 * Load multiple memory files from search results
 */
export function loadSearchResults(
  searchResults: FileSearchResult[],
  memoryDir: string,
  maxResults: number = 6,
): ContextEntry[] {
  const entries: ContextEntry[] = [];

  for (let i = 0; i < Math.min(searchResults.length, maxResults); i++) {
    const result = searchResults[i];
    if (!result) continue;

    const content = loadMemoryFile(result.file, memoryDir);
    if (content !== null) {
      entries.push({
        filename: result.file,
        score: result.score,
        content,
      });
    }
  }

  return entries;
}

/**
 * Always load user.md as the first context entry if it exists
 */
export function loadUserContext(memoryDir: string): ContextEntry | null {
  const content = loadMemoryFile("user.md", memoryDir);
  if (content === null) {
    return null;
  }

  return {
    filename: "user.md",
    score: 1.0, // Self context always scores highest
    content,
  };
}
