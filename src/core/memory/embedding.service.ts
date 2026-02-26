/**
 * Embedding service for generating vector embeddings
 * Used by the memory store for semantic search
 */

import { isEmbeddingResponse } from "../../utils";

export interface EmbeddingConfig {
  url: string;
  model: string;
}

/**
 * Embedding service for generating vector representations of text
 */
export class EmbeddingService {
  constructor(private config: EmbeddingConfig) {}

  /**
   * Get embedding vector for a text string
   * Uses Ollama API for generating embeddings
   */
  async getEmbedding(text: string): Promise<number[]> {
    const res = await fetch(this.config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.config.model, prompt: text }),
    });

    if (!res.ok) {
      throw new Error(`Ollama Error: ${res.status} ${res.statusText}`);
    }

    const data: unknown = await res.json();

    // Runtime validation guarantees type safety
    if (!isEmbeddingResponse(data)) {
      throw new Error("Invalid response format from embedding model.");
    }

    return data.embedding;
  }
}
