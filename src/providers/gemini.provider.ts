/**
 * Google Gemini LLM Provider
 * Uses @google/genai SDK for streaming with JSON mode
 */

import { GoogleGenAI } from "@google/genai";
import type {
  ILLMProvider,
  LLMMessage,
  StreamingCallbacks,
  LLMProviderConfig,
} from "../core/types";

/**
 * Schema for structured JSON response
 * Combines conversational response with memory mutations and reminder mutations
 */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    response: {
      type: "string",
      description: "The conversational response to show the user",
    },
    mutations: {
      type: "array",
      description: "Array of memory mutations to apply (optional)",
      items: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["create", "update", "delete"],
            description: "The type of mutation to perform",
          },
          file: {
            type: "string",
            description: "The name of the memory file (without .md extension)",
          },
          changes: {
            type: "object",
            properties: {
              metadata: {
                type: "object",
                description: "Metadata fields to update in frontmatter",
              },
              append: {
                type: "string",
                description: "Content to append to the file",
              },
              delete_lines: {
                type: "array",
                items: { type: "string" },
                description: "Lines to delete from the file",
              },
            },
          },
        },
        required: ["action", "file", "changes"],
      },
    },
    reminders: {
      type: "array",
      description:
        "Array of reminder mutations to create (optional). Use this when user asks to be reminded about something.",
      items: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["create_reminder"],
            description: "Always 'create_reminder' for reminders",
          },
          title: {
            type: "string",
            description: "Short reminder title (what to remind about)",
          },
          body: {
            type: "string",
            description: "Optional detailed reminder message",
          },
          type: {
            type: "string",
            enum: ["one_time", "recurring"],
            description:
              "one_time for single reminder, recurring for repeating",
          },
          datetime: {
            type: "string",
            description: "ISO 8601 UTC datetime for one_time reminders",
          },
          rrule: {
            type: "string",
            description:
              "RRULE string for recurring reminders (e.g., FREQ=DAILY;BYHOUR=9;BYMINUTE=0)",
          },
        },
        required: ["action", "title", "type"],
      },
    },
  },
  required: ["response"],
};

export class GeminiProvider implements ILLMProvider {
  private client: GoogleGenAI;
  private modelId: string = "gemini-2.0-flash";
  private useJsonMode: boolean = true;

  constructor(config: LLMProviderConfig & { useJsonMode?: boolean } = {}) {
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
    this.useJsonMode = config.useJsonMode ?? true;
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

      console.error(
        `🚀 Starting Gemini stream (model: ${this.modelId}, JSON mode: ${this.useJsonMode})`,
      );

      // Build generation config
      const generationConfig: any = this.useJsonMode
        ? {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          }
        : undefined;

      // Call generateContentStream on the models service
      const streamResult = await this.client.models.generateContentStream({
        model: this.modelId,
        contents: conversationHistory,
        // System instructions are now passed inside a config object
        config: {
          ...(systemMessage ? { systemInstruction: systemMessage } : {}),
          ...(generationConfig ? { generationConfig } : {}),
        },
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

      // If using JSON mode, validate the response
      if (this.useJsonMode) {
        try {
          const parsed = JSON.parse(fullContent);
          console.error("✅ JSON response validated successfully");
          if (parsed.mutations && parsed.mutations.length > 0) {
            console.error(
              `📝 ${parsed.mutations.length} mutations included in response`,
            );
          }
        } catch (e) {
          console.error(
            "⚠️  Warning: JSON mode enabled but response is not valid JSON",
          );
          console.error("   Response:", fullContent.slice(0, 200));
        }
      }

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
