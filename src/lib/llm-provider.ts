/**
 * LLM Provider abstraction layer
 * Allows swapping different LLM backends (Gemini, DeepSeek, Claude, etc.)
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

/**
 * Abstract LLM Provider interface
 * Implement this for each LLM service you want to support
 */
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

/**
 * Factory function to create providers
 */
export type ProviderFactory = (config: LLMProviderConfig) => ILLMProvider;

/**
 * Registry of available providers
 */
const providers = new Map<string, ProviderFactory>();

export function registerProvider(name: string, factory: ProviderFactory): void {
  providers.set(name.toLowerCase(), factory);
}

export function getProvider(
  name: string,
  config: LLMProviderConfig,
): ILLMProvider {
  const factory = providers.get(name.toLowerCase());
  if (!factory) {
    throw new Error(
      `Unknown LLM provider: ${name}. Available: ${Array.from(providers.keys()).join(", ")}`,
    );
  }
  return factory(config);
}

export function listProviders(): string[] {
  return Array.from(providers.keys());
}
