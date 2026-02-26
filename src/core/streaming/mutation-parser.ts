/**
 * Mutation detection and parsing from streamed content
 */

import type { MemoryMutation } from "../types";
import { validateMemoryMutation } from "../memory";

/**
 * Regular expression to find mutation blocks in text
 */
const MUTATION_REGEX =
  /===MEMORY_MUTATION_START===([\s\S]*?)===MEMORY_MUTATION_END===/g;

/**
 * Extract and parse mutations from full content
 * Returns array of validated mutations
 */
export function extractMutations(fullContent: string): MemoryMutation[] {
  const mutations: MemoryMutation[] = [];
  let match;
  let mutationCount = 0;

  while ((match = MUTATION_REGEX.exec(fullContent)) !== null) {
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

        mutations.push(mutation);
      } catch (e) {
        console.error(
          "❌ Failed to parse/validate memory mutation:",
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

  return mutations;
}

/**
 * Check if a token contains mutation markers
 */
export function containsMutationStart(token: string): boolean {
  return token.includes("===MEMORY_MUTATION_START===");
}

export function containsMutationEnd(token: string): boolean {
  return token.includes("===MEMORY_MUTATION_END===");
}
