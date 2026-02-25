/**
 * Streaming with memory mutation capture
 * Handles token streaming while detecting and capturing memory mutations
 * Evaluates file modifications securely on the final output string.
 */

import type { ILLMProvider, LLMMessage } from "./llm-provider";
import {
  validateMemoryMutation,
  applyMemoryMutation,
  type MemoryMutation,
} from "./mutations";

export interface MutationStreamingOptions {
  onToken?: (token: string) => void;
  onMemoryMutation?: (mutation: MemoryMutation) => Promise<void>;
  memoryDir?: string;
}

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
      if (!isHidingStream && token.includes("===MEMORY_MUTATION_START===")) {
        isHidingStream = true;
        console.error(
          `📍 Memory mutation START detected at token ${tokenCount}. Hiding from output.`,
        );
        return;
      }

      if (isHidingStream) {
        if (token.includes("===MEMORY_MUTATION_END===")) {
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

  // Use a regex to find all mutation blocks in the complete text
  const mutationRegex =
    /===MEMORY_MUTATION_START===([\s\S]*?)===MEMORY_MUTATION_END===/g;
  let match;
  let mutationCount = 0;

  while ((match = mutationRegex.exec(fullContent)) !== null) {
    mutationCount++;
    const memoryBuffer = match[1] || "";

    console.error(`\n--- Processing Mutation Block #${mutationCount} ---`);
    console.error(`Buffer length: ${memoryBuffer.length}`);

    const jsonMatch = memoryBuffer.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const payload = JSON.parse(jsonMatch[0]);
        console.error("✅ JSON parsed successfully");

        const mutation = validateMemoryMutation(payload);
        console.error("✅ Mutation validated successfully");

        // Apply mutation
        console.error(`🔧 Applying mutation to memory dir: ${memoryDir}`);
        applyMemoryMutation(mutation, memoryDir);
        console.error(
          `✅ Mutation applied successfully to ${mutation.file}.md`,
        );

        // Notify caller
        if (onMemoryMutation) {
          await onMemoryMutation(mutation).catch((e) => {
            console.error("❌ Error in onMemoryMutation callback:", e);
          });
        }
      } catch (e) {
        console.error(
          "❌ Failed to parse/apply memory mutation:",
          e instanceof Error ? e.message : String(e),
        );
        if (e instanceof Error) console.error("   Stack:", e.stack);
        console.error(
          "   First 300 chars of block:",
          memoryBuffer.slice(0, 300),
        );
      }
    } else {
      console.error("❌ No JSON found in this memory block");
      console.error("   Block content:", memoryBuffer.slice(0, 500));
    }
  }

  if (mutationCount === 0) {
    console.error("ℹ️ No memory mutations found in the final output.");
  }

  return fullContent;
}
