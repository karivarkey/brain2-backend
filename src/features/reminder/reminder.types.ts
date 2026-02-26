/**
 * Reminder types and interfaces
 */

export type ReminderType = "one_time" | "recurring";

export interface Reminder {
  id: string;
  userId: string;
  fcmToken: string;
  title: string;
  body: string;
  triggerAt: string | null; // ISO 8601 UTC string for one-time reminders
  rrule: string | null; // RRULE string for recurring reminders
  timezone: string;
  lastTriggeredAt: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderRequest {
  userId: string;
  fcmToken: string;
  naturalLanguage: string; // e.g., "Remind me tomorrow at 10 AM to do dishes"
  timezone?: string;
}

export interface UpdateReminderRequest {
  title?: string;
  body?: string;
  triggerAt?: string;
  rrule?: string;
  timezone?: string;
  active?: boolean;
}

export interface ParsedReminderIntent {
  type: ReminderType;
  title: string;
  body?: string;
  datetime?: string; // ISO 8601 for one-time
  rrule?: string; // RRULE for recurring
}

export interface ReminderDbRow {
  id: string;
  user_id: string;
  fcm_token: string;
  title: string;
  body: string;
  trigger_at: string | null;
  rrule: string | null;
  timezone: string;
  last_triggered_at: string | null;
  active: number; // SQLite stores booleans as integers
  created_at: string;
  updated_at: string;
}
