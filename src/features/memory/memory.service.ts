/**
 * Memory service layer
 * Business logic for memory operations
 */

import {
  getAllMemories,
  getMemoryById,
  createMemory,
  updateMemory,
  deleteMemory,
} from "./memory.db";
import type {
  MemoryFile,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  MemoryListResponse,
} from "./memory.types";

export class MemoryService {
  /**
   * Get all memories with optional filtering
   */
  static async listMemories(filter?: {
    type?: string;
    limit?: number;
  }): Promise<MemoryListResponse> {
    let memories = getAllMemories();

    // Filter by type if specified
    if (filter?.type) {
      memories = memories.filter((m) => m.type === filter.type);
    }

    // Apply limit if specified
    if (filter?.limit && filter.limit > 0) {
      memories = memories.slice(0, filter.limit);
    }

    return {
      memories,
      total: memories.length,
    };
  }

  /**
   * Get a single memory by ID
   */
  static async getMemory(id: string): Promise<MemoryFile | null> {
    return getMemoryById(id);
  }

  /**
   * Create a new memory
   */
  static async createMemory(request: CreateMemoryRequest): Promise<MemoryFile> {
    // Validate filename
    if (!request.filename.match(/^[a-z0-9_'-]+$/)) {
      throw new Error(
        "Invalid filename. Use only lowercase letters, numbers, hyphens, underscores, or apostrophes.",
      );
    }

    return createMemory(request);
  }

  /**
   * Update an existing memory
   */
  static async updateMemory(
    id: string,
    request: UpdateMemoryRequest,
  ): Promise<MemoryFile> {
    return updateMemory(id, request);
  }

  /**
   * Delete a memory
   */
  static async deleteMemory(id: string): Promise<boolean> {
    return deleteMemory(id);
  }
}
