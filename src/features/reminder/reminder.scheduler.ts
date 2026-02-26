/**
 * Reminder scheduler (cron-like service)
 * Runs every minute to check for due reminders and sends push notifications
 */

import { RRule } from "rrule";
import { ReminderDb } from "./reminder.db";
import { pushService } from "./push.service";

export class ReminderScheduler {
  private intervalId: Timer | null = null;
  private isRunning = false;
  private db: ReminderDb;

  constructor() {
    this.db = new ReminderDb();
  }

  /**
   * Start the scheduler (runs every minute)
   */
  start(): void {
    if (this.isRunning) {
      console.log("⏰ Reminder scheduler is already running");
      return;
    }

    console.log("⏰ Starting reminder scheduler (checks every 60 seconds)...");

    // Run immediately on start
    this.checkAndFireReminders();

    // Then run every minute
    this.intervalId = setInterval(() => {
      this.checkAndFireReminders();
    }, 60_000); // 60 seconds

    this.isRunning = true;
    console.log("✅ Reminder scheduler started successfully");
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("⏹️ Reminder scheduler stopped");
  }

  /**
   * Check for due reminders and fire them
   */
  private async checkAndFireReminders(): Promise<void> {
    const now = new Date();
    console.log(`\n🔍 [${now.toISOString()}] Checking for due reminders...`);

    try {
      // Get all one-time reminders that are due
      const dueReminders = this.db.getDueReminders(now);

      if (dueReminders.length === 0) {
        console.log("   No one-time reminders due");
      } else {
        console.log(`   Found ${dueReminders.length} due one-time reminder(s)`);
      }

      for (const reminder of dueReminders) {
        try {
          console.log(
            `   🔔 Firing reminder: "${reminder.title}" (ID: ${reminder.id})`,
          );

          // Send push notification
          await pushService.sendReminder(
            reminder.fcmToken,
            reminder.title,
            reminder.body,
            reminder.id,
          );

          // Mark as triggered
          this.db.markTriggered(reminder.id);

          // Deactivate one-time reminders after firing
          if (reminder.triggerAt && !reminder.rrule) {
            this.db.deactivate(reminder.id);
            console.log(`   ✅ One-time reminder deactivated: ${reminder.id}`);
          }
        } catch (error) {
          console.error(
            `   ❌ Failed to fire reminder ${reminder.id}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      // Handle recurring reminders with RRULE
      const recurringReminders = this.db.getActiveRecurring();

      if (recurringReminders.length === 0) {
        console.log("   No active recurring reminders");
      } else {
        console.log(
          `   Checking ${recurringReminders.length} recurring reminder(s)`,
        );
      }

      for (const reminder of recurringReminders) {
        try {
          if (!reminder.rrule) continue;

          // Parse RRULE string
          const rule = RRule.fromString(reminder.rrule);

          // Get the time of last trigger (or creation if never triggered)
          const lastTriggered = reminder.lastTriggeredAt
            ? new Date(reminder.lastTriggeredAt)
            : new Date(reminder.createdAt);

          // Find the next occurrence after the last triggered time
          const nextOccurrence = rule.after(lastTriggered, false);

          if (!nextOccurrence) {
            console.log(
              `   ⚠️  No more occurrences for recurring reminder: ${reminder.title}`,
            );
            this.db.deactivate(reminder.id);
            continue;
          }

          // Check if the next occurrence is due (now >= nextOccurrence)
          if (now >= nextOccurrence) {
            console.log(
              `   🔔 Firing recurring reminder: "${reminder.title}" (ID: ${reminder.id})`,
            );

            // Send push notification
            await pushService.sendReminder(
              reminder.fcmToken,
              reminder.title,
              reminder.body,
              reminder.id,
            );

            // Mark as triggered (updates lastTriggeredAt)
            this.db.markTriggered(reminder.id);

            console.log(
              `   ✅ Recurring reminder fired. Next occurrence: ${rule.after(now, false)?.toISOString() || "none"}`,
            );
          }
        } catch (error) {
          console.error(
            `   ❌ Failed to process recurring reminder ${reminder.id}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    } catch (error) {
      console.error(
        "❌ Error in reminder scheduler:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

// Singleton instance
export const reminderScheduler = new ReminderScheduler();
