/**
 * Reminder API router
 */

import { Router } from "express";
import {
  createReminderController,
  getUserRemindersController,
  getReminderController,
  updateReminderController,
  deleteReminderController,
  toggleReminderController,
  getNextOccurrencesController,
} from "./reminder.controller";

const router = Router();

// POST /api/reminders - Create a new reminder
router.post("/reminders", createReminderController);

// GET /api/reminders/:userId - Get all reminders for a user
router.get("/reminders/:userId", getUserRemindersController);

// GET /api/reminders/detail/:id - Get a single reminder
router.get("/reminders/detail/:id", getReminderController);

// PATCH /api/reminders/:id - Update a reminder
router.patch("/reminders/:id", updateReminderController);

// DELETE /api/reminders/:id - Delete a reminder
router.delete("/reminders/:id", deleteReminderController);

// POST /api/reminders/:id/toggle - Toggle active status
router.post("/reminders/:id/toggle", toggleReminderController);

// GET /api/reminders/:id/next - Get next occurrences for recurring reminder
router.get("/reminders/:id/next", getNextOccurrencesController);

export default router;
