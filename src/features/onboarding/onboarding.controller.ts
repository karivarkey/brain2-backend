/**
 * Onboarding controller
 * Handles onboarding requests
 */

import type { Request, Response } from "express";
import { onboardingService, type OnboardRequest } from "./onboarding.service";
import { applyMemoryMutation } from "../../core/memory";
import { memoryStore } from "../memory/memory.middleware";

const MEMORY_DIR = "./memory";

export async function onboardController(
  req: Request<{}, {}, OnboardRequest>,
  res: Response,
): Promise<void> {
  try {
    const { userId, timezone, data } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      res.status(400).json({
        error: "Invalid request",
        message: "data must be a non-empty array of strings",
      });
      return;
    }

    console.log(`\n🎯 Onboarding user${userId ? ` (${userId})` : ""}...`);
    console.log(`📝 Processing ${data.length} information item(s)`);

    // Process the onboarding data
    const result = await onboardingService.processOnboarding({
      userId,
      timezone,
      data,
    });

    // Apply mutations to memory files
    let appliedCount = 0;
    for (const mutation of result.mutations) {
      try {
        console.log(
          `🔧 Applying mutation: ${mutation.action} ${mutation.file}`,
        );
        applyMemoryMutation(mutation, MEMORY_DIR);
        appliedCount++;
        console.log(`✅ Mutation applied: ${mutation.file}.md`);
      } catch (error) {
        console.error(
          `❌ Failed to apply mutation:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    // Refresh memory index
    if (appliedCount > 0) {
      console.log(`🔄 Refreshing memory index...`);
      await memoryStore.refreshIndex();
      console.log(`✅ Memory index refreshed`);
    }

    res.json({
      success: true,
      message: result.message,
      userId,
      mutationsApplied: appliedCount,
      mutations: result.mutations.map((m) => ({
        action: m.action,
        file: m.file,
      })),
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    res.status(500).json({
      error: "Onboarding failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
