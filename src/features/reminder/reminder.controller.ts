/**
 * Reminder API controllers
 */

import type { Request, Response } from "express";
import { reminderService } from "./reminder.service";
import type {
  CreateReminderRequest,
  UpdateReminderRequest,
} from "./reminder.types";
import { getNextOccurrences, describeRRule } from "./rrule.utils";

/**
 * POST /api/reminders
 * Create a new reminder from natural language
 */
export async function createReminderController(
  req: Request<{}, {}, CreateReminderRequest>,
  res: Response,
): Promise<void> {
  try {
    const { userId, fcmToken, naturalLanguage, timezone } = req.body;

    if (!userId || !fcmToken || !naturalLanguage) {
      res.status(400).json({
        error: "Invalid request",
        message: "userId, fcmToken, and naturalLanguage are required",
      });
      return;
    }

    const reminder = await reminderService.createFromNaturalLanguage({
      userId,
      fcmToken,
      naturalLanguage,
      timezone,
    });

    res.status(201).json(reminder);
  } catch (error) {
    console.error("Error creating reminder:", error);
    res.status(500).json({
      error: "Failed to create reminder",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * GET /api/reminders/:userId
 * Get all reminders for a user
 */
export async function getUserRemindersController(
  req: Request<{ userId: string }>,
  res: Response,
): Promise<void> {
  try {
    const { userId } = req.params;
    const activeOnly = req.query.active === "true";

    const reminders = reminderService.getUserReminders(userId, activeOnly);
    res.json({ reminders });
  } catch (error) {
    console.error("Error fetching reminders:", error);
    res.status(500).json({
      error: "Failed to fetch reminders",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * GET /api/reminders/detail/:id
 * Get a single reminder by ID
 */
export async function getReminderController(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  try {
    const reminder = reminderService.getById(req.params.id);

    if (!reminder) {
      res.status(404).json({ error: "Reminder not found" });
      return;
    }

    res.json(reminder);
  } catch (error) {
    console.error("Error fetching reminder:", error);
    res.status(500).json({
      error: "Failed to fetch reminder",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * PATCH /api/reminders/:id
 * Update a reminder
 */
export async function updateReminderController(
  req: Request<{ id: string }, {}, UpdateReminderRequest>,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body;

    const reminder = reminderService.update(id, updates);

    if (!reminder) {
      res.status(404).json({ error: "Reminder not found" });
      return;
    }

    res.json(reminder);
  } catch (error) {
    console.error("Error updating reminder:", error);
    res.status(500).json({
      error: "Failed to update reminder",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * DELETE /api/reminders/:id
 * Delete a reminder
 */
export async function deleteReminderController(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const success = reminderService.delete(id);

    if (!success) {
      res.status(404).json({ error: "Reminder not found" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    res.status(500).json({
      error: "Failed to delete reminder",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * POST /api/reminders/:id/toggle
 * Toggle reminder active status
 */
export async function toggleReminderController(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const reminder = reminderService.toggleActive(id);

    if (!reminder) {
      res.status(404).json({ error: "Reminder not found" });
      return;
    }

    res.json(reminder);
  } catch (error) {
    console.error("Error toggling reminder:", error);
    res.status(500).json({
      error: "Failed to toggle reminder",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * GET /api/reminders/:id/next
 * Get the next N occurrences for a recurring reminder
 */
export async function getNextOccurrencesController(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const count = parseInt((req.query.count as string) || "5", 10);

    const reminder = reminderService.getById(id);

    if (!reminder) {
      res.status(404).json({ error: "Reminder not found" });
      return;
    }

    if (!reminder.rrule) {
      res.status(400).json({
        error: "Not a recurring reminder",
        message:
          "This reminder is a one-time reminder and has no recurrence pattern",
      });
      return;
    }

    const lastTriggered = reminder.lastTriggeredAt
      ? new Date(reminder.lastTriggeredAt)
      : new Date(reminder.createdAt);

    const nextOccurrences = getNextOccurrences(
      reminder.rrule,
      count,
      lastTriggered,
    );
    const description = describeRRule(reminder.rrule);

    res.json({
      id: reminder.id,
      title: reminder.title,
      rrule: reminder.rrule,
      description,
      lastTriggered: reminder.lastTriggeredAt,
      nextOccurrences: nextOccurrences.map((date) => date.toISOString()),
    });
  } catch (error) {
    console.error("Error getting next occurrences:", error);
    res.status(500).json({
      error: "Failed to get next occurrences",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
