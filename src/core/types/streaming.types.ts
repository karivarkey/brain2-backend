/**
 * Streaming-related type definitions
 */

import type { MemoryMutation } from "./memory.types";

export interface MutationStreamingOptions {
  onToken?: (token: string) => void;
  onMemoryMutation?: (mutation: MemoryMutation) => Promise<void>;
  memoryDir?: string;
}
