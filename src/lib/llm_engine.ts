/**
 * LLM Engine - Barrel Export
 * Re-exports all LLM-related modules for clean imports
 */

// Context & Formatting
export { buildContext, formatContext, formatContextBlock } from "./context";
export type { ContextBlock } from "./context";

// Prompt Building
export { buildPrompt, promptToMessages } from "./prompt";
export type { PromptMessage } from "./prompt";

// Mutations
export { validateMemoryMutation, applyMemoryMutation } from "./mutations";
export type { MemoryMutation } from "./mutations";

// Streaming
export { streamWithMutationCapture } from "./streaming";
export type { MutationStreamingOptions } from "./streaming";

// Provider Interface
export { registerProvider, getProvider, listProviders } from "./llm-provider";
export type {
  ILLMProvider,
  LLMMessage,
  StreamingCallbacks,
  LLMProviderConfig,
} from "./llm-provider";

// Concrete Providers
export { GeminiProvider } from "./gemini-provider";
