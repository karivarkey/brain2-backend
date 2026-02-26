/**
 * Streaming with memory mutation capture
 * Handles token streaming while detecting and capturing memory mutations
 * Supports both JSON-mode responses and legacy text-with-markers format
 */

import type {
  ILLMProvider,
  LLMMessage,
  MutationStreamingOptions,
  MemoryMutation,
  StreamingResult,
} from "../types";
import { applyMemoryMutation, validateMemoryMutation } from "../memory";
import {
  extractMutations,
  containsMutationStart,
  containsMutationEnd,
} from "./mutation-parser";

/**
 * Attempts to parse response as JSON with structured mutations
 * Returns { response, mutations } if successful, null otherwise
 */
function tryParseJsonResponse(content: string): {
  response: string;
  mutations: MemoryMutation[];
} | null {
  try {
    // Strip markdown code fences if present (Gemini often wraps JSON in ```json ... ```)
    let cleanedContent = content.trim();

    // Remove leading ```json or ``` and trailing ```
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent.slice(7); // Remove ```json
    } else if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.slice(3); // Remove ```
    }

    if (cleanedContent.endsWith("```")) {
      cleanedContent = cleanedContent.slice(0, -3); // Remove trailing ```
    }

    cleanedContent = cleanedContent.trim();

    const parsed = JSON.parse(cleanedContent);

    if (typeof parsed.response !== "string") {
      return null;
    }

    const mutations: MemoryMutation[] = [];

    if (Array.isArray(parsed.mutations)) {
      for (const mut of parsed.mutations) {
        try {
          const validated = validateMemoryMutation(mut);
          mutations.push(validated);
        } catch (e) {
          console.error(
            "⚠️ Invalid mutation in JSON response, skipping:",
            e instanceof Error ? e.message : String(e),
          );
        }
      }
    }

    return { response: parsed.response, mutations };
  } catch {
    return null;
  }
}

/**
 * Streams LLM response while capturing memory mutations.
 * Returns structured data with the clean response and mutation count.
 */
export async function streamWithMutationCapture(
  provider: ILLMProvider,
  messages: LLMMessage[],
  options: MutationStreamingOptions = {},
): Promise<StreamingResult> {
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

  // 2. Try to parse as JSON first (new structured format)
  console.error("🔍 Attempting to parse response as JSON...");
  const jsonParsed = tryParseJsonResponse(fullContent);

  let cleanContent: string;
  let mutations: MemoryMutation[];

  if (jsonParsed) {
    console.error("✅ JSON response detected and parsed successfully");
    console.error(`   Response length: ${jsonParsed.response.length} chars`);
    console.error(`   Mutations found: ${jsonParsed.mutations.length}`);

    cleanContent = jsonParsed.response;
    mutations = jsonParsed.mutations;

    // For JSON mode, we need to output the response now since it was buffered
    if (onToken && cleanContent) {
      // Send the clean response all at once
      onToken(cleanContent);
    }
  } else {
    console.error("ℹ️ Not JSON format, using legacy text-with-markers parsing");
    console.error("🔍 Scanning final output for memory mutations...");

    // Legacy parsing: extract mutations from text markers
    mutations = extractMutations(fullContent);

    // Strip mutation blocks from the response
    cleanContent = fullContent.replace(
      /===MEMORY_MUTATION_START===[\s\S]*?===MEMORY_MUTATION_END===/g,
      "",
    );

    // Clean up any extra whitespace at the end
    cleanContent = cleanContent.replace(/\s+$/, "");
  }

  // 4. Apply mutations
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

  console.error(
    `✅ Processing complete. ${mutations.length} mutations applied.`,
  );

  return {
    response: cleanContent,
    mutationsApplied: mutations.length,
    mutations,
  };
}
