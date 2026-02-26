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
  action: "create" | "update" | "delete";
  file: string;
  changes: {
    metadata?: Record<
      string,
      string | number | boolean | string[] | Record<string, unknown>
    >;
    append?: string;
    delete_lines?: string[];
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
