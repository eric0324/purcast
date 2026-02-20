import { describe, it, expect, vi, beforeEach } from "vitest";

// === Hoisted mocks ===
const {
  mockJobRunCreate,
  mockJobRunUpdate,
  mockJobRunFindFirst,
  mockJobUpdate,
  mockJobUpdateMany,
  mockPodcastCreate,
  mockJobArticleCreateMany,
  mockCheckUsageLimit,
  mockIncrementUsage,
  mockFetchSources,
  mockFilterPipeline,
  mockGenerateAggregatedScript,
  mockCreateTTSProvider,
  mockSynthesizeScript,
  mockConcatAudioSegments,
  mockGetAudioDuration,
  mockUploadFile,
  mockPublishToChannels,
  mockResolveChannels,
  mockCalculateNextRunAt,
} = vi.hoisted(() => ({
  mockJobRunCreate: vi.fn(),
  mockJobRunUpdate: vi.fn(),
  mockJobRunFindFirst: vi.fn(),
  mockJobUpdate: vi.fn(),
  mockJobUpdateMany: vi.fn(),
  mockPodcastCreate: vi.fn(),
  mockJobArticleCreateMany: vi.fn(),
  mockCheckUsageLimit: vi.fn(),
  mockIncrementUsage: vi.fn(),
  mockFetchSources: vi.fn(),
  mockFilterPipeline: vi.fn(),
  mockGenerateAggregatedScript: vi.fn(),
  mockCreateTTSProvider: vi.fn(),
  mockSynthesizeScript: vi.fn(),
  mockConcatAudioSegments: vi.fn(),
  mockGetAudioDuration: vi.fn(),
  mockUploadFile: vi.fn(),
  mockPublishToChannels: vi.fn(),
  mockResolveChannels: vi.fn(),
  mockCalculateNextRunAt: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    jobRun: {
      create: mockJobRunCreate,
      update: mockJobRunUpdate,
      findFirst: mockJobRunFindFirst,
    },
    job: { update: mockJobUpdate, updateMany: mockJobUpdateMany },
    podcast: { create: mockPodcastCreate },
    jobArticle: { createMany: mockJobArticleCreateMany },
  },
}));

vi.mock("@/lib/billing/usage", () => ({
  checkUsageLimit: mockCheckUsageLimit,
  incrementUsage: mockIncrementUsage,
}));

vi.mock("@/lib/jobs/sources", () => ({
  fetchSources: mockFetchSources,
}));

vi.mock("@/lib/jobs/filtering", () => ({
  filterPipeline: mockFilterPipeline,
}));

vi.mock("@/lib/llm/aggregate", () => ({
  generateAggregatedScript: mockGenerateAggregatedScript,
}));

vi.mock("@/lib/tts/provider", () => ({
  createTTSProvider: mockCreateTTSProvider,
}));

vi.mock("@/lib/tts/synthesize-script", () => ({
  synthesizeScript: mockSynthesizeScript,
}));

vi.mock("@/lib/audio/concat", () => ({
  concatAudioSegments: mockConcatAudioSegments,
}));

vi.mock("@/lib/audio/duration", () => ({
  getAudioDuration: mockGetAudioDuration,
}));

vi.mock("@/lib/r2/utils", () => ({
  uploadFile: mockUploadFile,
}));

vi.mock("@/lib/jobs/outputs", () => ({
  publishToChannels: mockPublishToChannels,
}));

vi.mock("@/lib/jobs/outputs/resolve", () => ({
  resolveChannels: mockResolveChannels,
}));

vi.mock("@/lib/jobs/schedule", () => ({
  calculateNextRunAt: mockCalculateNextRunAt,
}));

vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

import { executeJob, hasInProgressRun } from "@/lib/jobs/pipeline";

const jobData = {
  id: "job-1",
  userId: "user-1",
  sources: [{ type: "rss" as const, url: "https://example.com/feed" }],
  schedule: { mode: "daily" as const, time: "08:00", timezone: "Asia/Taipei" },
  filterConfig: { includeKeywords: ["tech"] },
  generationConfig: {
    stylePreset: "news_brief" as const,
    voiceId: "voice-a",
    maxArticles: 5,
    targetMinutes: 15,
  },
  outputConfig: [{ channelId: "ch-1", format: "audio" as const }],
};

const mockArticles = [
  { title: "Article 1", url: "https://a.com/1", content: "Content 1" },
  { title: "Article 2", url: "https://a.com/2", content: "Content 2" },
];

const mockScript = [
  { speaker: "A" as const, text: "Hello" },
  { speaker: "B" as const, text: "World" },
];

beforeEach(() => {
  vi.clearAllMocks();

  // Default happy path setup
  mockJobRunCreate.mockResolvedValue({ id: "run-1", jobId: "job-1" });
  mockJobRunUpdate.mockResolvedValue({});
  mockJobUpdate.mockResolvedValue({});
  mockCheckUsageLimit.mockResolvedValue({ allowed: true, used: 1, limit: 5, plan: "free" });
  mockIncrementUsage.mockResolvedValue(undefined);
  mockFetchSources.mockResolvedValue(mockArticles);
  mockFilterPipeline.mockResolvedValue({
    selected: mockArticles,
    selectedMeta: mockArticles.map((a) => ({ title: a.title, url: a.url, reason: "Matched" })),
  });
  mockGenerateAggregatedScript.mockResolvedValue({ dialogue: mockScript, inputTokens: 100, outputTokens: 200 });
  mockCreateTTSProvider.mockReturnValue({});
  mockSynthesizeScript.mockResolvedValue([Buffer.from("audio1"), Buffer.from("audio2")]);
  mockConcatAudioSegments.mockResolvedValue(Buffer.from("final-audio"));
  mockGetAudioDuration.mockResolvedValue(120.5);
  mockUploadFile.mockResolvedValue("https://r2.example.com/audio.mp3");
  mockPodcastCreate.mockResolvedValue({ id: "podcast-1" });
  mockResolveChannels.mockResolvedValue([{ type: "telegram", chatId: "123", format: "audio" }]);
  mockPublishToChannels.mockResolvedValue([{ type: "telegram", success: true }]);
  mockJobArticleCreateMany.mockResolvedValue({ count: 2 });
  mockJobUpdateMany.mockResolvedValue({ count: 0 });
  mockCalculateNextRunAt.mockReturnValue(new Date("2026-02-20T00:00:00Z"));
});

describe("executeJob", () => {
  it("completes full pipeline successfully", async () => {
    await executeJob(jobData);

    // Should create a run
    expect(mockJobRunCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { jobId: "job-1", status: "pending" } })
    );

    // Should check quota
    expect(mockCheckUsageLimit).toHaveBeenCalledWith("user-1");

    // Should fetch sources
    expect(mockFetchSources).toHaveBeenCalledWith(jobData.sources);

    // Should filter
    expect(mockFilterPipeline).toHaveBeenCalled();

    // Should generate script
    expect(mockGenerateAggregatedScript).toHaveBeenCalledWith(
      mockArticles,
      expect.objectContaining({ stylePreset: "news_brief", targetMinutes: 15 })
    );

    // Should synthesize
    expect(mockSynthesizeScript).toHaveBeenCalled();

    // Should upload
    expect(mockUploadFile).toHaveBeenCalled();

    // Should create podcast
    expect(mockPodcastCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          sourceType: "job",
          status: "completed",
        }),
      })
    );

    // Should increment usage
    expect(mockIncrementUsage).toHaveBeenCalledWith("user-1");

    // Should publish
    expect(mockPublishToChannels).toHaveBeenCalled();

    // Should record articles
    expect(mockJobArticleCreateMany).toHaveBeenCalled();

    // Should mark run as completed
    expect(mockJobRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1" },
        data: expect.objectContaining({ status: "completed", podcastId: "podcast-1" }),
      })
    );

    // Should update next_run_at
    expect(mockJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job-1" },
        data: expect.objectContaining({ nextRunAt: expect.any(Date) }),
      })
    );
  });

  it("fails and pauses job when quota exhausted", async () => {
    mockCheckUsageLimit.mockResolvedValue({ allowed: false, used: 5, limit: 5, plan: "free" });

    await executeJob(jobData);

    // Should mark run as failed with quota error
    expect(mockJobRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "failed", errorMessage: "quota_exhausted" }),
      })
    );

    // Should pause the job
    expect(mockJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job-1" },
        data: expect.objectContaining({ status: "paused" }),
      })
    );

    // Should NOT proceed with fetch
    expect(mockFetchSources).not.toHaveBeenCalled();
  });

  it("skips run when no articles pass filtering", async () => {
    mockFilterPipeline.mockResolvedValue({ selected: [], selectedMeta: [] });

    await executeJob(jobData);

    expect(mockJobRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "skipped" }),
      })
    );

    // Should NOT proceed to script generation
    expect(mockGenerateAggregatedScript).not.toHaveBeenCalled();
  });

  it("marks run as failed on pipeline error", async () => {
    mockFetchSources.mockRejectedValue(new Error("Network timeout"));

    await executeJob(jobData);

    // Should mark as failed with error
    expect(mockJobRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "failed",
          errorMessage: "Network timeout",
        }),
      })
    );

    // Should still update next_run_at
    expect(mockJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nextRunAt: expect.any(Date) }),
      })
    );
  });

  it("auto-pauses all user jobs when quota exhausted after generation", async () => {
    // First check passes (allowed: true), second check after increment fails
    mockCheckUsageLimit
      .mockResolvedValueOnce({ allowed: true, used: 4, limit: 5, plan: "free" })
      .mockResolvedValueOnce({ allowed: false, used: 5, limit: 5, plan: "free" });

    await executeJob(jobData);

    // Should call updateMany to pause all active jobs
    expect(mockJobUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "active" },
      data: { status: "paused" },
    });
  });

  it("continues despite channel delivery failure", async () => {
    mockPublishToChannels.mockResolvedValue([
      { type: "telegram", success: false, error: "Bot blocked" },
    ]);

    await executeJob(jobData);

    // Should still mark run as completed
    expect(mockJobRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "completed" }),
      })
    );
  });
});

describe("hasInProgressRun", () => {
  it("returns true if an in-progress run exists", async () => {
    mockJobRunFindFirst.mockResolvedValue({ id: "run-1", status: "generating_script" });

    const result = await hasInProgressRun("job-1");
    expect(result).toBe(true);
  });

  it("returns false if no in-progress run", async () => {
    mockJobRunFindFirst.mockResolvedValue(null);

    const result = await hasInProgressRun("job-1");
    expect(result).toBe(false);
  });
});
