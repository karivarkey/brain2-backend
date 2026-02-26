/**
 * Database layer for reminders
 * Handles all SQLite operations for reminder CRUD
 */

import { Database } from "bun:sqlite";
import type {
  Reminder,
  ReminderDbRow,
  UpdateReminderRequest,
} from "./reminder.types";

export class ReminderDb {
  private db: Database;

  constructor(dbPath: string = "chat.db") {
    this.db = new Database(dbPath);
  }

  /**
   * Convert DB row to domain Reminder type
   */
  private mapRowToReminder(row: ReminderDbRow): Reminder {
    return {
      id: row.id,
      userId: row.user_id,
      fcmToken: row.fcm_token,
      title: row.title,
      body: row.body,
      triggerAt: row.trigger_at,
      rrule: row.rrule,
      timezone: row.timezone,
      lastTriggeredAt: row.last_triggered_at,
      active: row.active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Create a new reminder
   */
  create(reminder: Omit<Reminder, "createdAt" | "updatedAt">): Reminder {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO reminders (
        id, user_id, fcm_token, title, body, 
        trigger_at, rrule, timezone, last_triggered_at, 
        active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      reminder.id,
      reminder.userId,
      reminder.fcmToken,
      reminder.title,
      reminder.body,
      reminder.triggerAt,
      reminder.rrule,
      reminder.timezone,
      reminder.lastTriggeredAt,
      reminder.active ? 1 : 0,
      now,
      now,
    );

    return {
      ...reminder,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get reminder by ID
   */
  getById(id: string): Reminder | null {
    const stmt = this.db.query<ReminderDbRow, [string]>(`
      SELECT * FROM reminders WHERE id = ?
    `);

    const row = stmt.get(id);
    return row ? this.mapRowToReminder(row) : null;
  }

  /**
   * Get all reminders for a user
   */
  getByUserId(userId: string): Reminder[] {
    const stmt = this.db.query<ReminderDbRow, [string]>(`
      SELECT * FROM reminders 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(userId);
    return rows.map((row) => this.mapRowToReminder(row));
  }

  /**
   * Get all active reminders for a user
   */
  getActiveByUserId(userId: string): Reminder[] {
    const stmt = this.db.query<ReminderDbRow, [string]>(`
      SELECT * FROM reminders 
      WHERE user_id = ? AND active = 1
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(userId);
    return rows.map((row) => this.mapRowToReminder(row));
  }

  /**
   * Get all due reminders (trigger_at <= now and active)
   */
  getDueReminders(now: Date): Reminder[] {
    const nowIso = now.toISOString();
    const stmt = this.db.query<ReminderDbRow, [string]>(`
      SELECT * FROM reminders 
      WHERE trigger_at <= ? 
        AND trigger_at IS NOT NULL
        AND active = 1
      ORDER BY trigger_at ASC
    `);

    const rows = stmt.all(nowIso);
    return rows.map((row) => this.mapRowToReminder(row));
  }

  /**
   * Get all active recurring reminders
   */
  getActiveRecurring(): Reminder[] {
    const stmt = this.db.query<ReminderDbRow, []>(`
      SELECT * FROM reminders 
      WHERE rrule IS NOT NULL 
        AND active = 1
    `);

    const rows = stmt.all();
    return rows.map((row) => this.mapRowToReminder(row));
  }

  /**
   * Update a reminder
   */
  update(id: string, updates: UpdateReminderRequest): Reminder | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push("title = ?");
      values.push(updates.title);
    }
    if (updates.body !== undefined) {
      fields.push("body = ?");
      values.push(updates.body);
    }
    if (updates.triggerAt !== undefined) {
      fields.push("trigger_at = ?");
      values.push(updates.triggerAt);
    }
    if (updates.rrule !== undefined) {
      fields.push("rrule = ?");
      values.push(updates.rrule);
    }
    if (updates.timezone !== undefined) {
      fields.push("timezone = ?");
      values.push(updates.timezone);
    }
    if (updates.active !== undefined) {
      fields.push("active = ?");
      values.push(updates.active ? 1 : 0);
    }

    fields.push("updated_at = ?");
    values.push(now);

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE reminders 
      SET ${fields.join(", ")} 
      WHERE id = ?
    `);

    stmt.run(...values);

    return this.getById(id);
  }

  /**
   * Mark reminder as triggered
   */
  markTriggered(id: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE reminders 
      SET last_triggered_at = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(now, now, id);
  }

  /**
   * Deactivate a reminder (for one-time reminders after firing)
   */
  deactivate(id: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE reminders 
      SET active = 0, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(now, id);
  }

  /**
   * Delete a reminder
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM reminders WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
