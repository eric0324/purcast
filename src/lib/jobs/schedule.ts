import type { JobSchedule } from "./types";

/**
 * Calculate the next run time based on schedule config.
 * Returns a Date in UTC for storing in DB.
 */
export function calculateNextRunAt(schedule: JobSchedule): Date {
  const now = new Date();

  // Parse time
  const [hours, minutes] = schedule.time.split(":").map(Number);

  if (schedule.mode === "daily") {
    return getNextDaily(now, hours, minutes, schedule.timezone);
  }

  if (schedule.mode === "weekly") {
    const weekday = schedule.weekday ?? 1; // Default to Monday
    return getNextWeekly(now, hours, minutes, schedule.timezone, weekday);
  }

  // Fallback: next day same time
  return getNextDaily(now, hours, minutes, schedule.timezone);
}

function getNextDaily(
  now: Date,
  hours: number,
  minutes: number,
  timezone: string
): Date {
  // Create a date formatter for the target timezone
  const candidate = createDateInTimezone(now, hours, minutes, timezone);

  // If the time has already passed today, move to tomorrow
  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + 1);
    return createDateInTimezone(candidate, hours, minutes, timezone);
  }

  return candidate;
}

function getNextWeekly(
  now: Date,
  hours: number,
  minutes: number,
  timezone: string,
  targetWeekday: number // 0=Sunday ... 6=Saturday
): Date {
  // Get today in the target timezone
  const nowInTz = new Date(
    now.toLocaleString("en-US", { timeZone: timezone })
  );
  const currentWeekday = nowInTz.getDay();

  let daysUntil = targetWeekday - currentWeekday;
  if (daysUntil < 0) daysUntil += 7;
  if (daysUntil === 0) {
    // Same weekday: check if time has passed
    const candidate = createDateInTimezone(now, hours, minutes, timezone);
    if (candidate > now) {
      return candidate;
    }
    daysUntil = 7;
  }

  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + daysUntil);
  return createDateInTimezone(targetDate, hours, minutes, timezone);
}

/**
 * Create a Date object that represents the given time in the given timezone,
 * returned as UTC.
 */
function createDateInTimezone(
  referenceDate: Date,
  hours: number,
  minutes: number,
  timezone: string
): Date {
  // Get YYYY-MM-DD in the target timezone
  const dateStr = referenceDate.toLocaleDateString("en-CA", {
    timeZone: timezone,
  }); // en-CA gives YYYY-MM-DD format

  // Construct datetime string in the target timezone
  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  const dateTimeStr = `${dateStr}T${timeStr}`;

  // Get UTC offset for this datetime in the timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  });

  const tempDate = new Date(`${dateTimeStr}Z`);
  const parts = formatter.formatToParts(tempDate);
  const tzPart = parts.find((p) => p.type === "timeZoneName");
  const offsetStr = tzPart?.value || "GMT";

  // Parse offset like "GMT+08:00" or "GMT-05:00" or "GMT"
  const offsetMatch = offsetStr.match(/GMT([+-])(\d{2}):(\d{2})/);
  let offsetMinutes = 0;
  if (offsetMatch) {
    const sign = offsetMatch[1] === "+" ? 1 : -1;
    offsetMinutes = sign * (parseInt(offsetMatch[2]) * 60 + parseInt(offsetMatch[3]));
  }

  // Convert local time to UTC by subtracting the offset
  const utcMs = new Date(`${dateTimeStr}Z`).getTime() - offsetMinutes * 60 * 1000;
  return new Date(utcMs);
}
