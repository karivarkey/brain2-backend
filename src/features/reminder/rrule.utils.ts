/**
 * RRULE utility functions
 * Helpers for working with recurring reminders
 */

import { RRule, Frequency } from "rrule";

/**
 * Common RRULE patterns for quick creation
 */
export const RRulePatterns = {
  /**
   * Every day at a specific time
   * @param hour - Hour in 24-hour format (0-23)
   * @param minute - Minute (0-59)
   */
  daily: (hour: number, minute: number = 0): string => {
    return `FREQ=DAILY;BYHOUR=${hour};BYMINUTE=${minute}`;
  },

  /**
   * Every weekday (Mon-Fri) at a specific time
   * @param hour - Hour in 24-hour format (0-23)
   * @param minute - Minute (0-59)
   */
  weekdays: (hour: number, minute: number = 0): string => {
    return `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=${hour};BYMINUTE=${minute}`;
  },

  /**
   * Every weekend (Sat-Sun) at a specific time
   * @param hour - Hour in 24-hour format (0-23)
   * @param minute - Minute (0-59)
   */
  weekends: (hour: number, minute: number = 0): string => {
    return `FREQ=WEEKLY;BYDAY=SA,SU;BYHOUR=${hour};BYMINUTE=${minute}`;
  },

  /**
   * Specific days of the week
   * @param days - Array of day codes: MO, TU, WE, TH, FR, SA, SU
   * @param hour - Hour in 24-hour format (0-23)
   * @param minute - Minute (0-59)
   */
  weekly: (days: string[], hour: number, minute: number = 0): string => {
    return `FREQ=WEEKLY;BYDAY=${days.join(",")};BYHOUR=${hour};BYMINUTE=${minute}`;
  },

  /**
   * Every N hours
   * @param interval - Number of hours between reminders
   */
  hourly: (interval: number = 1): string => {
    return `FREQ=HOURLY;INTERVAL=${interval}`;
  },

  /**
   * Every N minutes
   * @param interval - Number of minutes between reminders
   */
  minutely: (interval: number = 1): string => {
    return `FREQ=MINUTELY;INTERVAL=${interval}`;
  },

  /**
   * Monthly on a specific day
   * @param dayOfMonth - Day of the month (1-31)
   * @param hour - Hour in 24-hour format (0-23)
   * @param minute - Minute (0-59)
   */
  monthly: (
    dayOfMonth: number,
    hour: number = 9,
    minute: number = 0,
  ): string => {
    return `FREQ=MONTHLY;BYMONTHDAY=${dayOfMonth};BYHOUR=${hour};BYMINUTE=${minute}`;
  },
};

/**
 * Calculate the next N occurrences for an RRULE
 * @param rruleString - The RRULE string
 * @param count - Number of occurrences to calculate
 * @param after - Calculate occurrences after this date (default: now)
 */
export function getNextOccurrences(
  rruleString: string,
  count: number = 5,
  after: Date = new Date(),
): Date[] {
  try {
    const rule = RRule.fromString(rruleString);
    return rule.after(after, true) ? rule.all((_, i) => i < count) : [];
  } catch (error) {
    console.error("Error parsing RRULE:", error);
    return [];
  }
}

/**
 * Get a human-readable description of an RRULE
 * @param rruleString - The RRULE string
 */
export function describeRRule(rruleString: string): string {
  try {
    const rule = RRule.fromString(rruleString);
    return rule.toText();
  } catch (error) {
    return "Invalid RRULE";
  }
}

/**
 * Validate if an RRULE string is valid
 * @param rruleString - The RRULE string to validate
 */
export function isValidRRule(rruleString: string): boolean {
  try {
    RRule.fromString(rruleString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert timezone-aware time to UTC for RRULE
 * Note: RRULE times are timezone-agnostic, so you need to convert to UTC
 * @param hour - Local hour
 * @param minute - Local minute
 * @param timezone - IANA timezone string (e.g., "Asia/Kolkata")
 */
export function convertToUTCHour(
  hour: number,
  minute: number,
  timezone: string,
): { hour: number; minute: number } {
  // Create a date with the specified time in the user's timezone
  const localDate = new Date();
  localDate.setHours(hour, minute, 0, 0);

  // Convert to UTC
  const utcDate = new Date(
    localDate.toLocaleString("en-US", { timeZone: timezone }),
  );

  return {
    hour: utcDate.getUTCHours(),
    minute: utcDate.getUTCMinutes(),
  };
}
