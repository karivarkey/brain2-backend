/**
 * LLM-related type definitions
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamingCallbacks {
  onToken?: (token: string) => void;
  onError?: (error: Error) => void;
}

export interface LLMProviderConfig {
  apiKey?: string;
  baseURL?: string;
  modelId?: string;
}

export interface ILLMProvider {
  /**
   * Stream a response from the LLM
   * Must handle token streaming and return the full content
   */
  stream(
    messages: LLMMessage[],
    callbacks?: StreamingCallbacks,
  ): Promise<string>;

  /**
   * Get the provider name (for logging/debugging)
   */
  getName(): string;
}

export type ProviderFactory = (config: LLMProviderConfig) => ILLMProvider;
