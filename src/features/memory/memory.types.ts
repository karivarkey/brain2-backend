/**
 * Memory API types
 */

export interface MemoryFile {
  id: string;
  filename: string;
  metadata: Record<string, any>;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMemoryRequest {
  filename: string;
  metadata?: Record<string, any>;
  content: string;
}

export interface UpdateMemoryRequest {
  metadata?: Record<string, any>;
  content?: string;
  append?: string;
  delete_lines?: string[];
}

export interface MemoryListItem {
  id: string;
  filename: string;
  type?: string;
  last_updated?: string;
  preview?: string;
}

export interface MemoryListResponse {
  memories: MemoryListItem[];
  total: number;
}
