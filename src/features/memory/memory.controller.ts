/**
 * Memory API controllers
 */

import type { Request, Response } from "express";
import { MemoryService } from "./memory.service";
import type { CreateMemoryRequest, UpdateMemoryRequest } from "./memory.types";

/**
 * GET /api/memory
 * List all memories
 */
export async function listMemoriesController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const type = req.query.type as string | undefined;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string)
      : undefined;

    const result = await MemoryService.listMemories({ type, limit });
    res.json(result);
  } catch (error) {
    console.error("Error listing memories:", error);
    res.status(500).json({
      error: "Failed to list memories",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * GET /api/memory/:id
 * Get a single memory by ID
 */
export async function getMemoryController(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  try {
    const memory = await MemoryService.getMemory(req.params.id);

    if (!memory) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }

    res.json(memory);
  } catch (error) {
    console.error("Error fetching memory:", error);
    res.status(500).json({
      error: "Failed to fetch memory",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * POST /api/memory
 * Create a new memory
 */
export async function createMemoryController(
  req: Request<{}, {}, CreateMemoryRequest>,
  res: Response,
): Promise<void> {
  try {
    const { filename, metadata, content } = req.body;

    if (!filename || !content) {
      res.status(400).json({
        error: "Invalid request",
        message: "filename and content are required",
      });
      return;
    }

    const memory = await MemoryService.createMemory({
      filename,
      metadata,
      content,
    });

    res.status(201).json(memory);
  } catch (error) {
    console.error("Error creating memory:", error);

    if (error instanceof Error && error.message.includes("already exists")) {
      res.status(409).json({
        error: "Memory already exists",
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: "Failed to create memory",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * PATCH /api/memory/:id
 * Update an existing memory
 */
export async function updateMemoryController(
  req: Request<{ id: string }, {}, UpdateMemoryRequest>,
  res: Response,
): Promise<void> {
  try {
    const memory = await MemoryService.updateMemory(req.params.id, req.body);
    res.json(memory);
  } catch (error) {
    console.error("Error updating memory:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      res.status(404).json({
        error: "Memory not found",
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: "Failed to update memory",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * DELETE /api/memory/:id
 * Delete a memory
 */
export async function deleteMemoryController(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  try {
    const success = await MemoryService.deleteMemory(req.params.id);

    if (!success) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting memory:", error);
    res.status(500).json({
      error: "Failed to delete memory",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
