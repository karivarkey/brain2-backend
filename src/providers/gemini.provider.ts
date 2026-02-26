/**
 * Google Gemini LLM Provider
 * Uses @google/genai SDK for streaming
 */

import { GoogleGenAI } from "@google/genai";
import type {
  ILLMProvider,
  LLMMessage,
  StreamingCallbacks,
  LLMProviderConfig,
} from "../core/types";

export class GeminiProvider implements ILLMProvider {
  private client: GoogleGenAI;
  private modelId: string = "gemini-2.0-flash";

  constructor(config: LLMProviderConfig = {}) {
    const apiKey =
      config.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      "";

    if (!apiKey) {
      throw new Error(
        "Gemini API Key not found. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.",
      );
    }

    // Initialize the new GoogleGenAI client
    this.client = new GoogleGenAI({ apiKey });
    this.modelId = config.modelId || this.modelId;
  }

  async stream(
    messages: LLMMessage[],
    callbacks?: StreamingCallbacks,
  ): Promise<string> {
    try {
      // Convert LLMMessage format to genai format
      const conversationHistory = messages
        .filter((msg) => msg.role !== "system")
        .map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        }));

      // Find system message if present
      const systemMessage = messages
        .filter((msg) => msg.role === "system")
        .map((msg) => msg.content)
        .join("\n");

      let fullContent = "";
      let chunkCount = 0;

      console.error(`🚀 Starting Gemini stream (model: ${this.modelId})`);

      // Call generateContentStream on the models service
      const streamResult = await this.client.models.generateContentStream({
        model: this.modelId,
        contents: conversationHistory,
        // System instructions are now passed inside a config object
        config: systemMessage
          ? { systemInstruction: systemMessage }
          : undefined,
      });

      // The returned object itself is the iterable stream
      for await (const chunk of streamResult) {
        chunkCount++;
        // In the new SDK, text is a property, not a function
        const text = chunk.text;

        if (text) {
          fullContent += text;
          if (callbacks?.onToken) {
            callbacks.onToken(text);
          }
        } else {
          console.error(`⚠️  Chunk ${chunkCount} had no text content`);
        }
      }

      console.error(
        `✅ Stream complete (${chunkCount} chunks, ${fullContent.length} chars)`,
      );
      return fullContent;
    } catch (error) {
      console.error(
        `❌ Gemini API Error:`,
        error instanceof Error ? error.message : String(error),
      );
      if (error instanceof Error) {
        console.error(`   Stack:`, error.stack);
      }
      if (callbacks?.onError) {
        callbacks.onError(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
      throw error;
    }
  }

  getName(): string {
    return `Gemini (${this.modelId})`;
  }
}
