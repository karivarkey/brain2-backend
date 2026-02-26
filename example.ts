/**
 * Example usage of the modular Brain2 framework
 * Demonstrates how to use the new architecture
 */

// Import types
import type {
  MemoryConfig,
  LLMMessage,
  MutationStreamingOptions,
} from "./src/core/types";

// Import memory functionality
import { MemoryStore } from "./src/core/memory";

// Import context and prompt builders
import { buildContext } from "./src/core/context";
import { buildPrompt, promptToMessages } from "./src/core/prompt";

// Import LLM providers
import { GeminiProvider } from "./src/providers";

// Import streaming
import { streamWithMutationCapture } from "./src/core/streaming";

/**
 * Example: Complete workflow from query to response
 */
async function exampleWorkflow() {
  // 1. Initialize memory store
  const memoryConfig: Partial<MemoryConfig> = {
    memoryDir: "./memory",
    dbPath: "./memory_index.db",
    ollamaUrl: "http://localhost:11434/api/embeddings",
    model: "qwen3-embedding:0.6b",
    chunkSize: 800,
    topK: 6,
  };

  const memoryStore = new MemoryStore(memoryConfig);

  // 2. Refresh index (sync filesystem with database)
  console.log("Refreshing memory index...");
  await memoryStore.refreshIndex();

  // 3. Search for relevant memories
  const userQuery = "What are my current stress triggers?";
  console.log(`\nSearching for: "${userQuery}"`);
  const searchResults = await memoryStore.search(userQuery);

  console.log(`Found ${searchResults.length} relevant files:`);
  searchResults.forEach((result) => {
    console.log(`  - ${result.file} (score: ${result.score.toFixed(4)})`);
  });

  // 4. Build context
  const context = await buildContext(searchResults, "./memory", 6);
  console.log(`\nBuilt context with ${context.entries.length} entries`);

  // 5. Build prompt
  const prompt = buildPrompt(userQuery, context);
  console.log("\nPrompt structure ready");

  // 6. Convert to LLM messages
  const messages = promptToMessages(prompt);

  // 7. Initialize LLM provider
  const provider = new GeminiProvider({
    apiKey: process.env.GEMINI_API_KEY,
    modelId: "gemini-2.0-flash",
  });

  // 8. Stream response with mutation capture
  console.log("\n--- LLM Response ---\n");

  const streamOptions: MutationStreamingOptions = {
    onToken: (token: string) => {
      process.stdout.write(token);
    },
    onMemoryMutation: async (mutation) => {
      console.log(
        `\n\n[Mutation applied: ${mutation.action} ${mutation.file}]`,
      );
      // Optionally re-index after mutation
      // await memoryStore.refreshIndex();
    },
    memoryDir: "./memory",
  };

  const fullResponse = await streamWithMutationCapture(
    provider,
    messages,
    streamOptions,
  );

  console.log("\n\n--- Complete ---");
  console.log(`Total response length: ${fullResponse.length} characters`);
}

/**
 * Example: Using individual modules
 */
async function exampleIndividualModules() {
  // Just parse a memory file
  const { parseMemoryFile } = await import("./src/core/memory");
  const content = `---
id: example
type: person
aliases: [ex, sample]
roles: [friend]
---

This is an example memory file.
  `;

  const parsed = parseMemoryFile(content);
  console.log("Parsed memory:", parsed);

  // Just format some context
  const { formatContextBlock } = await import("./src/core/context");
  const sampleContext = {
    entries: [
      {
        filename: "user.md",
        score: 1.0,
        content: "User information here...",
      },
    ],
  };

  const formatted = formatContextBlock(sampleContext);
  console.log("\nFormatted context:\n", formatted);

  // Just use utilities
  const { sha256, cosineSimilarity } = await import("./src/utils");
  const hash = sha256("Hello, world!");
  console.log("\nSHA-256 hash:", hash);

  const similarity = cosineSimilarity([1, 0, 0], [1, 0, 0]);
  console.log("Cosine similarity:", similarity);
}

// Run examples
if (import.meta.main) {
  console.log("=== Brain2 Modular Framework - Usage Examples ===\n");

  try {
    // Uncomment to run:
    // await exampleWorkflow();
    await exampleIndividualModules();
  } catch (error) {
    console.error("Error:", error);
  }
}

exampleWorkflow();
