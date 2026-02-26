/**
 * Memory API router
 */

import { Router } from "express";
import {
  listMemoriesController,
  getMemoryController,
  createMemoryController,
  updateMemoryController,
  deleteMemoryController,
} from "./memory.controller";

const router = Router();

// GET /api/memory - List all memories
router.get("/memory", listMemoriesController);

// GET /api/memory/:id - Get a single memory
router.get("/memory/:id", getMemoryController);

// POST /api/memory - Create a new memory
router.post("/memory", createMemoryController);

// PATCH /api/memory/:id - Update a memory
router.patch("/memory/:id", updateMemoryController);

// DELETE /api/memory/:id - Delete a memory
router.delete("/memory/:id", deleteMemoryController);

export default router;
