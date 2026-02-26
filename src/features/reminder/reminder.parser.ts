/**
 * AI-powered reminder parser
 * Extracts structured reminder data from natural language
 */

import { RRule } from "rrule";
import { GeminiProvider } from "../../providers/gemini.provider";
import type { ParsedReminderIntent } from "./reminder.types";

const REMINDER_SCHEMA = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["one_time", "recurring"],
      description:
        "Type of reminder: one_time for single occurrence, recurring for repeating",
    },
    title: {
      type: "string",
      description: "Short title/summary of what to remind about",
    },
    body: {
      type: "string",
      description: "Optional detailed description or context",
    },
    datetime: {
      type: "string",
      description:
        "ISO 8601 datetime string in UTC (only for one_time reminders)",
    },
    rrule: {
      type: "string",
      description:
        "RRULE string for recurring reminders (e.g., FREQ=DAILY;BYHOUR=9;BYMINUTE=0)",
    },
  },
  required: ["type", "title"],
};

export class ReminderParser {
  private provider: GeminiProvider;

  constructor() {
    this.provider = new GeminiProvider({
      apiKey: process.env.GEMINI_API_KEY!,
      modelId: "gemini-2.0-flash",
      useJsonMode: false, // We'll use direct JSON parsing
    });
  }

  /**
   * Parse natural language into structured reminder intent
   */
  async parse(
    naturalLanguage: string,
    userTimezone: string = "UTC",
  ): Promise<ParsedReminderIntent> {
    const now = new Date();
    const systemPrompt = `You are a reminder parsing assistant. Your job is to extract reminder information from natural language and return ONLY valid JSON.

Current time: ${now.toISOString()}
User timezone: ${userTimezone}

Rules:
1. For ONE-TIME reminders (e.g., "tomorrow at 10 AM", "on Friday at 3 PM"):
   - Set type: "one_time"
   - Provide datetime in ISO 8601 UTC format
   - Convert user's timezone to UTC

2. For RECURRING reminders (e.g., "every day at 8 AM", "every Monday and Wednesday at 6 PM"):
   - Set type: "recurring"
   - Provide RRULE string following RFC 5545
   - Examples:
     * "every day at 9 AM" → FREQ=DAILY;BYHOUR=9;BYMINUTE=0
     * "every weekday at 8 AM" → FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8;BYMINUTE=0
     * "every Monday at 6 PM" → FREQ=WEEKLY;BYDAY=MO;BYHOUR=18;BYMINUTE=0
     * "every 2 hours" → FREQ=HOURLY;INTERVAL=2

3. Extract a clear, concise title (the action to remind about)
4. Add optional body text if there's additional context

Return ONLY a JSON object with these fields: type, title, body (optional), datetime (for one_time), rrule (for recurring).
Be precise with time conversions and RRULE syntax.`;

    try {
      const response = await this.provider.stream([
        { role: "system", content: systemPrompt },
        { role: "user", content: naturalLanguage },
      ]);

      // Parse JSON response
      let cleanedContent = response.trim();

      // Remove markdown code fences if present
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.slice(7);
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.slice(3);
      }

      if (cleanedContent.endsWith("```")) {
        cleanedContent = cleanedContent.slice(0, -3);
      }

      cleanedContent = cleanedContent.trim();

      const parsed = JSON.parse(cleanedContent) as ParsedReminderIntent;

      // Validation
      if (!parsed.type || !parsed.title) {
        throw new Error("Failed to parse reminder: missing required fields");
      }

      if (parsed.type === "one_time" && !parsed.datetime) {
        throw new Error("One-time reminder requires a datetime");
      }

      if (parsed.type === "recurring") {
        if (!parsed.rrule) {
          throw new Error("Recurring reminder requires an RRULE");
        }

        // Validate the RRULE can be parsed
        if (!this.isValidRRule(parsed.rrule)) {
          throw new Error(`Invalid RRULE format: ${parsed.rrule}`);
        }

        // Test that RRULE can be parsed by the library
        try {
          RRule.fromString(parsed.rrule);
        } catch (e) {
          throw new Error(
            `RRULE string cannot be parsed: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      return parsed;
    } catch (error) {
      console.error("Failed to parse reminder:", error);
      throw new Error(
        `Failed to parse reminder: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate RRULE string (basic check)
   */
  private isValidRRule(rrule: string): boolean {
    // Basic validation: must start with FREQ=
    return /^FREQ=(YEARLY|MONTHLY|WEEKLY|DAILY|HOURLY|MINUTELY|SECONDLY)/.test(
      rrule,
    );
  }
}

export const reminderParser = new ReminderParser();
