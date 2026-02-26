/**
 * Streaming module barrel export
 * Centralized exports for streaming functionality
 */

// Mutation parser
export {
  extractMutations,
  containsMutationStart,
  containsMutationEnd,
} from "./mutation-parser";

// Stream handler
export { streamWithMutationCapture } from "./stream-handler";
