/**
 * Context module barrel export
 * Centralized exports for context building and formatting
 */

// Loader
export { loadMemoryFile, loadSearchResults, loadUserContext } from "./loader";
export type { ContextEntry } from "./loader";

// Builder
export { buildContext } from "./builder";

// Formatter
export { formatContext, formatContextBlock } from "./formatter";
