/**
 * Streaming-related type definitions
 */

import type { MemoryMutation } from "./memory.types";

export interface ReminderMutation {
  action: "create_reminder";
  title: string;
  body?: string;
  type: "one_time" | "recurring";
  datetime?: string; // ISO 8601 UTC for one_time
  rrule?: string; // RRULE for recurring
}

export interface MutationStreamingOptions {
  onToken?: (token: string) => void;
  onMemoryMutation?: (mutation: MemoryMutation) => Promise<void>;
  onReminderMutation?: (mutation: ReminderMutation) => Promise<void>;
  memoryDir?: string;
  userId?: string;
  fcmToken?: string;
}

export interface StreamingResult {
  response: string;
  mutationsApplied: number;
  mutations: MemoryMutation[];
  reminderMutations: ReminderMutation[];
  remindersCreated: number;
}
