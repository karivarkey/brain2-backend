/**
 * Streaming with memory mutation capture
 * Handles token streaming while detecting and capturing memory mutations
 */

import type {
  ILLMProvider,
  LLMMessage,
  MutationStreamingOptions,
} from "../types";
import { applyMemoryMutation } from "../memory";
import {
  extractMutations,
  containsMutationStart,
  containsMutationEnd,
} from "./mutation-parser";

/**
 * Streams LLM response while capturing memory mutations.
 * Tokens inside memory markers are hidden from the user output.
 * Mutations are validated and applied on the final complete output string.
 */
export async function streamWithMutationCapture(
  provider: ILLMProvider,
  messages: LLMMessage[],
  options: MutationStreamingOptions = {},
): Promise<string> {
  const { onToken, onMemoryMutation, memoryDir = "./memory" } = options;

  let fullContent = "";
  let isHidingStream = false;
  let tokenCount = 0;

  const callbacksForProvider = {
    onToken: (token: string) => {
      fullContent += token;
      tokenCount++;

      // Simple toggle to hide mutation markers and JSON from the user's UI
      if (!isHidingStream && containsMutationStart(token)) {
        isHidingStream = true;
        console.error(
          `📍 Memory mutation START detected at token ${tokenCount}. Hiding from output.`,
        );
        return;
      }

      if (isHidingStream) {
        if (containsMutationEnd(token)) {
          isHidingStream = false;
          console.error(
            `📍 Memory mutation END detected at token ${tokenCount}. Resuming output.`,
          );
        }
        return; // Suppress output while inside mutation block
      }

      // Forward token to user if not in memory section
      if (onToken && token) {
        onToken(token);
      }
    },
  };

  console.error(`🔄 Starting stream capture (provider: ${provider.getName()})`);

  // 1. Let the entire stream complete
  await provider.stream(messages, callbacksForProvider);

  console.error(
    `🏁 Stream ended after ${tokenCount} tokens, total content: ${fullContent.length} chars`,
  );

  if (isHidingStream) {
    console.error(
      "⚠️ WARNING: Stream ended but memory mutation block was never closed!",
    );
  }

  // 2. Parse the final output string for mutations
  console.error("🔍 Scanning final output for memory mutations...");

  const mutations = extractMutations(fullContent);

  // 3. Apply mutations
  for (const mutation of mutations) {
    try {
      console.error(`🔧 Applying mutation to memory dir: ${memoryDir}`);
      applyMemoryMutation(mutation, memoryDir);
      console.error(`✅ Mutation applied successfully to ${mutation.file}.md`);

      // Notify caller
      if (onMemoryMutation) {
        await onMemoryMutation(mutation).catch((e) => {
          console.error("❌ Error in onMemoryMutation callback:", e);
        });
      }
    } catch (e) {
      console.error(
        "❌ Failed to apply memory mutation:",
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  return fullContent;
}
