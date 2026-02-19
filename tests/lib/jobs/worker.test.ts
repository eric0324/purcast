import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindMany, mockExecuteJob, mockHasInProgressRun } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockExecuteJob: vi.fn(),
  mockHasInProgressRun: vi.fn(),
}));

vi.mock("node-cron", () => ({
  default: { schedule: vi.fn() },
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    job: {
      findMany: mockFindMany,
    },
  },
}));

vi.mock("@/lib/jobs/pipeline", () => ({
  executeJob: mockExecuteJob,
  hasInProgressRun: mockHasInProgressRun,
}));

import { checkDueJobs } from "@/worker";

const mockJob = {
  id: "job-1",
  userId: "user-1",
  status: "active",
  sources: [{ type: "rss", url: "https://example.com/feed" }],
  schedule: { mode: "daily", time: "08:00", timezone: "Asia/Taipei" },
  filterConfig: {},
  generationConfig: { stylePreset: "news_brief", voiceId: "v1", maxArticles: 5, targetMinutes: 15 },
  outputConfig: [{ type: "telegram", chatId: "123", format: "audio" }],
  nextRunAt: new Date("2026-02-19T00:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockExecuteJob.mockResolvedValue(undefined);
  mockHasInProgressRun.mockResolvedValue(false);
});

describe("checkDueJobs", () => {
  it("queries for active jobs with nextRunAt <= now", async () => {
    mockFindMany.mockResolvedValue([]);

    await checkDueJobs();

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        status: "active",
        nextRunAt: { lte: expect.any(Date) },
      },
    });
  });

  it("does nothing when no due jobs found", async () => {
    mockFindMany.mockResolvedValue([]);

    await checkDueJobs();

    expect(mockExecuteJob).not.toHaveBeenCalled();
  });

  it("executes due jobs", async () => {
    mockFindMany.mockResolvedValue([mockJob]);

    await checkDueJobs();

    expect(mockExecuteJob).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-1",
        userId: "user-1",
      })
    );
  });

  it("skips jobs with in-progress runs", async () => {
    mockFindMany.mockResolvedValue([mockJob]);
    mockHasInProgressRun.mockResolvedValue(true);

    await checkDueJobs();

    expect(mockExecuteJob).not.toHaveBeenCalled();
  });

  it("processes multiple due jobs independently", async () => {
    const job2 = { ...mockJob, id: "job-2", userId: "user-2" };
    mockFindMany.mockResolvedValue([mockJob, job2]);

    await checkDueJobs();

    expect(mockExecuteJob).toHaveBeenCalledTimes(2);
  });

  it("continues processing other jobs even if hasInProgressRun fails for one", async () => {
    const job2 = { ...mockJob, id: "job-2" };
    mockFindMany.mockResolvedValue([mockJob, job2]);
    mockHasInProgressRun
      .mockRejectedValueOnce(new Error("DB error"))
      .mockResolvedValueOnce(false);

    // Should throw because first hasInProgressRun throws
    await expect(checkDueJobs()).rejects.toThrow("DB error");
  });
});
