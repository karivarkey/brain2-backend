/**
 * Context builder
 * Combines user context and search results into a context block
 */

import type { FileSearchResult, ContextBlock } from "../types";
import { loadUserContext, loadSearchResults } from "./loader";

/**
 * Builds full file content from search results
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
  const userContext = loadUserContext(memoryDir);
  if (userContext !== null) {
    entries.push(userContext);
  }

  // Load search results (up to maxResults-1 to account for user.md)
  const resultsToLoad = Math.min(
    searchResults.length,
    maxResults - entries.length,
  );

  const searchEntries = loadSearchResults(
    searchResults.slice(0, resultsToLoad),
    memoryDir,
    resultsToLoad,
  );

  entries.push(...searchEntries);

  return { entries };
}
