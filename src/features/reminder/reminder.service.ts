/**
 * Reminder service layer
 * Business logic for reminder operations
 */

import { randomUUID } from "crypto";
import { ReminderDb } from "./reminder.db";
import { reminderParser } from "./reminder.parser";
import type {
  Reminder,
  CreateReminderRequest,
  UpdateReminderRequest,
} from "./reminder.types";

export class ReminderService {
  private db: ReminderDb;

  constructor() {
    this.db = new ReminderDb();
  }

  /**
   * Create a new reminder from natural language
   */
  async createFromNaturalLanguage(
    request: CreateReminderRequest,
  ): Promise<Reminder> {
    const timezone = request.timezone || "UTC";

    // Parse natural language using AI
    const intent = await reminderParser.parse(
      request.naturalLanguage,
      timezone,
    );

    // Create reminder in database
    const reminder: Omit<Reminder, "createdAt" | "updatedAt"> = {
      id: randomUUID(),
      userId: request.userId,
      fcmToken: request.fcmToken,
      title: intent.title,
      body: intent.body || "",
      triggerAt: intent.type === "one_time" ? intent.datetime! : null,
      rrule: intent.type === "recurring" ? intent.rrule! : null,
      timezone,
      lastTriggeredAt: null,
      active: true,
    };

    return this.db.create(reminder);
  }

  /**
   * Get reminder by ID
   */
  getById(id: string): Reminder | null {
    return this.db.getById(id);
  }

  /**
   * Get all reminders for a user
   */
  getUserReminders(userId: string, activeOnly: boolean = false): Reminder[] {
    return activeOnly
      ? this.db.getActiveByUserId(userId)
      : this.db.getByUserId(userId);
  }

  /**
   * Update a reminder
   */
  update(id: string, updates: UpdateReminderRequest): Reminder | null {
    return this.db.update(id, updates);
  }

  /**
   * Delete a reminder
   */
  delete(id: string): boolean {
    return this.db.delete(id);
  }

  /**
   * Toggle reminder active status
   */
  toggleActive(id: string): Reminder | null {
    const reminder = this.db.getById(id);
    if (!reminder) return null;

    return this.db.update(id, { active: !reminder.active });
  }
}

export const reminderService = new ReminderService();
