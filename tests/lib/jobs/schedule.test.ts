import { describe, it, expect, vi, afterEach } from "vitest";
import { calculateNextRunAt } from "@/lib/jobs/schedule";
import type { JobSchedule } from "@/lib/jobs/types";

afterEach(() => {
  vi.useRealTimers();
});

describe("calculateNextRunAt", () => {
  describe("daily mode", () => {
    it("returns today's time if it hasn't passed yet", () => {
      // Simulate "now" being 2026-02-19 06:00 UTC (14:00 Taipei)
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-19T06:00:00Z"));

      const schedule: JobSchedule = {
        mode: "daily",
        time: "20:00", // 20:00 Taipei = 12:00 UTC
        timezone: "Asia/Taipei",
      };

      const next = calculateNextRunAt(schedule);

      // Should be today 20:00 Taipei = 12:00 UTC
      expect(next.toISOString()).toBe("2026-02-19T12:00:00.000Z");
    });

    it("returns tomorrow's time if today's time has passed", () => {
      // Simulate "now" being 2026-02-19 14:00 UTC (22:00 Taipei)
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-19T14:00:00Z"));

      const schedule: JobSchedule = {
        mode: "daily",
        time: "08:00", // 08:00 Taipei = 00:00 UTC
        timezone: "Asia/Taipei",
      };

      const next = calculateNextRunAt(schedule);

      // Should be tomorrow 08:00 Taipei = 00:00 UTC on 2026-02-20
      expect(next.toISOString()).toBe("2026-02-20T00:00:00.000Z");
    });

    it("handles midnight timezone correctly", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-19T15:00:00Z"));

      const schedule: JobSchedule = {
        mode: "daily",
        time: "00:00",
        timezone: "Asia/Taipei",
      };

      const next = calculateNextRunAt(schedule);

      // 00:00 Taipei = 16:00 UTC previous day
      // 2026-02-19 15:00 UTC is 2026-02-19 23:00 Taipei
      // Next 00:00 Taipei is 2026-02-20 00:00 Taipei = 2026-02-19 16:00 UTC
      expect(next.toISOString()).toBe("2026-02-19T16:00:00.000Z");
    });
  });

  describe("weekly mode", () => {
    it("returns this week's day if it hasn't passed yet", () => {
      // 2026-02-19 is Thursday (weekday=4)
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-19T00:00:00Z")); // Thursday 08:00 Taipei

      const schedule: JobSchedule = {
        mode: "weekly",
        time: "09:00",
        timezone: "Asia/Taipei",
        weekday: 5, // Friday
      };

      const next = calculateNextRunAt(schedule);

      // Next Friday is 2026-02-20, 09:00 Taipei = 01:00 UTC
      expect(next.toISOString()).toBe("2026-02-20T01:00:00.000Z");
    });

    it("returns next week if this week's day has passed", () => {
      // 2026-02-19 is Thursday (weekday=4)
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-19T06:00:00Z")); // Thursday 14:00 Taipei

      const schedule: JobSchedule = {
        mode: "weekly",
        time: "09:00",
        timezone: "Asia/Taipei",
        weekday: 1, // Monday
      };

      const next = calculateNextRunAt(schedule);

      // Next Monday is 2026-02-23, 09:00 Taipei = 01:00 UTC
      expect(next.toISOString()).toBe("2026-02-23T01:00:00.000Z");
    });

    it("returns next week's same day if same-day time has passed", () => {
      // 2026-02-19 is Thursday
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-19T14:00:00Z")); // Thursday 22:00 Taipei

      const schedule: JobSchedule = {
        mode: "weekly",
        time: "08:00",
        timezone: "Asia/Taipei",
        weekday: 4, // Thursday
      };

      const next = calculateNextRunAt(schedule);

      // Same day but time passed, so next Thursday = 2026-02-26
      // 08:00 Taipei = 00:00 UTC
      expect(next.toISOString()).toBe("2026-02-26T00:00:00.000Z");
    });

    it("defaults to Monday when weekday not specified", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-19T00:00:00Z")); // Thursday

      const schedule: JobSchedule = {
        mode: "weekly",
        time: "09:00",
        timezone: "Asia/Taipei",
        // weekday not set
      };

      const next = calculateNextRunAt(schedule);

      // Next Monday = 2026-02-23, 09:00 Taipei = 01:00 UTC
      expect(next.toISOString()).toBe("2026-02-23T01:00:00.000Z");
    });
  });
});
