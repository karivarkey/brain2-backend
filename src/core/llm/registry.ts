/**
 * LLM Provider registry
 * Allows swapping different LLM backends (Gemini, DeepSeek, Claude, etc.)
 */

import type {
  ILLMProvider,
  ProviderFactory,
  LLMProviderConfig,
} from "../types";

/**
 * Registry of available providers
 */
const providers = new Map<string, ProviderFactory>();

/**
 * Register a new LLM provider
 */
export function registerProvider(name: string, factory: ProviderFactory): void {
  providers.set(name.toLowerCase(), factory);
}

/**
 * Get a provider instance by name
 */
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

/**
 * List all registered provider names
 */
export function listProviders(): string[] {
  return Array.from(providers.keys());
}
