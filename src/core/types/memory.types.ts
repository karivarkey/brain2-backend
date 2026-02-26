/**
 * Memory-related type definitions
 */

export interface MemoryConfig {
  memoryDir: string;
  dbPath: string;
  ollamaUrl: string;
  model: string;
  chunkSize: number;
  topK: number;
}

export interface MemoryMeta {
  id: string;
  type: string;
  aliases: string[];
  roles: string[];
  body: string;
}

export interface MemoryMutation {
  action: "create" | "update";
  file: string;
  changes: {
    append?: string;
    add_alias?: string;
    add_role?: string;
  };
}

export interface SearchResult {
  file: string;
  score: number;
  chunkIndex: number;
}

export interface FileSearchResult {
  file: string;
  score: number;
}
