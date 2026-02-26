/**
 * Memory middleware
 * Refreshes embeddings after memory operations
 */

import type { Request, Response, NextFunction } from "express";
import { MemoryStore } from "../../core/memory";

const MEMORY_DIR = "./memory";

// Global memory store instance - shared across all memory operations
const memoryStore = new MemoryStore({
  memoryDir: MEMORY_DIR,
  topK: 6,
});

/**
 * Middleware to refresh memory embeddings after successful memory operations
 * Should be used after the controller executes successfully
 */
export async function refreshEmbeddingsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Store the original res.json to intercept it
  const originalJson = res.json.bind(res);

  // Override res.json to refresh embeddings after successful responses
  res.json = function (body: any) {
    // Only refresh on successful responses (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Don't block the response - refresh asynchronously
      setImmediate(async () => {
        try {
          console.log(
            "🔄 Refreshing memory embeddings after memory operation...",
          );
          await memoryStore.refreshIndex();
          console.log("✅ Memory embeddings refreshed successfully");
        } catch (error) {
          console.error("❌ Error refreshing memory embeddings:", error);
        }
      });
    }

    // Send the response immediately
    return originalJson(body);
  } as any;

  next();
}

/**
 * Export the memory store instance for use in other parts of the application
 */
export { memoryStore };
