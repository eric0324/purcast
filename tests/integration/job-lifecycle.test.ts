/**
 * Integration test: Full Job lifecycle
 *
 * Tests the complete flow:
 *   Create Job → Activate → Worker picks up → Pipeline executes
 *   → Podcast created → Output delivered → Usage incremented → Articles recorded
 *
 * All external services are mocked (DB, LLM, TTS, R2, channels),
 * but the orchestration across modules is exercised end-to-end.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// === Hoisted mocks for all external dependencies ===
const {
  // Prisma operations (tracks all DB calls in order)
  mockJobCreate,
  mockJobFindUnique,
  mockJobFindMany,
  mockJobUpdate,
  mockJobUpdateMany,
  mockJobRunCreate,
  mockJobRunUpdate,
  mockJobRunFindFirst,
  mockPodcastCreate,
  mockJobArticleCreateMany,
  // Auth
  mockGetCurrentUser,
  // Billing
  mockCheckUsageLimit,
  mockIncrementUsage,
  // Sources & filtering
  mockFetchSources,
  mockFilterPipeline,
  // LLM
  mockGenerateAggregatedScript,
  // TTS
  mockCreateTTSProvider,
  mockSynthesizeScript,
  // Audio
  mockConcatAudioSegments,
  mockGetAudioDuration,
  // R2
  mockUploadFile,
  // Output channels
  mockPublishToChannels,
  // Schedule
  mockCalculateNextRunAt,
} = vi.hoisted(() => ({
  mockJobCreate: vi.fn(),
  mockJobFindUnique: vi.fn(),
  mockJobFindMany: vi.fn(),
  mockJobUpdate: vi.fn(),
  mockJobUpdateMany: vi.fn(),
  mockJobRunCreate: vi.fn(),
  mockJobRunUpdate: vi.fn(),
  mockJobRunFindFirst: vi.fn(),
  mockPodcastCreate: vi.fn(),
  mockJobArticleCreateMany: vi.fn(),
  mockGetCurrentUser: vi.fn(),
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
  mockCalculateNextRunAt: vi.fn(),
}));

// === Module mocks ===

vi.mock("@/lib/db/client", () => ({
  prisma: {
    job: {
      create: mockJobCreate,
      findUnique: mockJobFindUnique,
      findMany: mockJobFindMany,
      update: mockJobUpdate,
      updateMany: mockJobUpdateMany,
    },
    jobRun: {
      create: mockJobRunCreate,
      update: mockJobRunUpdate,
      findFirst: mockJobRunFindFirst,
    },
    podcast: { create: mockPodcastCreate },
    jobArticle: { createMany: mockJobArticleCreateMany },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: mockGetCurrentUser,
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

vi.mock("@/lib/jobs/schedule", () => ({
  calculateNextRunAt: mockCalculateNextRunAt,
}));

vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock("node-cron", () => ({
  default: { schedule: vi.fn() },
}));

// === Imports (after mocks) ===
import { executeJob, hasInProgressRun } from "@/lib/jobs/pipeline";
import { checkDueJobs } from "@/worker";

// === Test data ===

const testArticles = [
  { title: "AI Breakthrough", url: "https://news.example.com/ai", content: "Major AI progress..." },
  { title: "Tech Trends 2026", url: "https://news.example.com/trends", content: "New trends emerging..." },
  { title: "Podcast Industry", url: "https://news.example.com/podcast", content: "Podcast continues to grow..." },
];

const testSelectedMeta = testArticles.map((a) => ({
  title: a.title,
  url: a.url,
  reason: "Matched keyword filter",
}));

const testScript = [
  { speaker: "A" as const, text: "Welcome to today's tech digest!" },
  { speaker: "B" as const, text: "We have three fascinating stories." },
  { speaker: "A" as const, text: "First up, a major AI breakthrough." },
  { speaker: "B" as const, text: "And the podcast industry keeps growing." },
];

const jobConfig = {
  id: "job-e2e-1",
  userId: "user-e2e-1",
  name: "Daily Tech Digest",
  sources: [
    { type: "rss" as const, url: "https://techcrunch.com/feed" },
    { type: "url" as const, url: "https://news.ycombinator.com" },
  ],
  schedule: { mode: "daily" as const, time: "08:00", timezone: "Asia/Taipei" },
  filterConfig: {
    includeKeywords: ["AI", "tech", "podcast"],
    excludeKeywords: ["crypto"],
  },
  generationConfig: {
    stylePreset: "news_brief" as const,
    voiceId: "voice-cloned-1",
    maxArticles: 5,
    targetMinutes: 15,
  },
  outputConfig: [
    { type: "telegram" as const, chatId: "tg-chat-123", format: "audio" as const },
  ],
};

// === Setup ===

beforeEach(() => {
  vi.clearAllMocks();

  // Default: happy path
  mockJobRunCreate.mockResolvedValue({ id: "run-e2e-1", jobId: "job-e2e-1" });
  mockJobRunUpdate.mockResolvedValue({});
  mockJobUpdate.mockResolvedValue({});
  mockJobUpdateMany.mockResolvedValue({ count: 0 });
  mockJobRunFindFirst.mockResolvedValue(null);

  mockCheckUsageLimit.mockResolvedValue({ allowed: true, used: 2, limit: 10, plan: "pro" });
  mockIncrementUsage.mockResolvedValue(undefined);

  mockFetchSources.mockResolvedValue(testArticles);
  mockFilterPipeline.mockResolvedValue({
    selected: testArticles,
    selectedMeta: testSelectedMeta,
  });
  mockGenerateAggregatedScript.mockResolvedValue({
    script: testScript,
    inputTokens: 500,
    outputTokens: 300,
  });
  mockCreateTTSProvider.mockReturnValue({});
  mockSynthesizeScript.mockResolvedValue([
    Buffer.from("seg-1"),
    Buffer.from("seg-2"),
    Buffer.from("seg-3"),
    Buffer.from("seg-4"),
  ]);
  mockConcatAudioSegments.mockResolvedValue(Buffer.from("final-audio-e2e"));
  mockGetAudioDuration.mockResolvedValue(842.3);
  mockUploadFile.mockResolvedValue("https://r2.example.com/podcasts/user-e2e-1/job-e2e-1.mp3");
  mockPodcastCreate.mockResolvedValue({ id: "podcast-e2e-1" });
  mockPublishToChannels.mockResolvedValue([{ type: "telegram", success: true }]);
  mockJobArticleCreateMany.mockResolvedValue({ count: 3 });
  mockCalculateNextRunAt.mockReturnValue(new Date("2026-02-20T00:00:00Z"));
});

// === Tests ===

describe("Job Lifecycle — End-to-End Integration", () => {
  describe("Happy Path: Full lifecycle", () => {
    it("executes complete pipeline: fetch → filter → script → audio → upload → podcast → publish → record", async () => {
      await executeJob(jobConfig);

      // Verify all key operations were called
      expect(mockJobRunCreate).toHaveBeenCalledTimes(1);
      expect(mockCheckUsageLimit).toHaveBeenCalledTimes(2); // initial + auto-pause
      expect(mockFetchSources).toHaveBeenCalledTimes(1);
      expect(mockFilterPipeline).toHaveBeenCalledTimes(1);
      expect(mockGenerateAggregatedScript).toHaveBeenCalledTimes(1);
      expect(mockSynthesizeScript).toHaveBeenCalledTimes(1);
      expect(mockConcatAudioSegments).toHaveBeenCalledTimes(1);
      expect(mockGetAudioDuration).toHaveBeenCalledTimes(1);
      expect(mockUploadFile).toHaveBeenCalledTimes(1);
      expect(mockPodcastCreate).toHaveBeenCalledTimes(1);
      expect(mockIncrementUsage).toHaveBeenCalledTimes(1);
      expect(mockPublishToChannels).toHaveBeenCalledTimes(1);
      expect(mockJobArticleCreateMany).toHaveBeenCalledTimes(1);

      // Verify execution happened in correct order via mock invocation order:
      // fetchSources was called before filterPipeline
      const fetchOrder = mockFetchSources.mock.invocationCallOrder[0];
      const filterOrder = mockFilterPipeline.mock.invocationCallOrder[0];
      const scriptOrder = mockGenerateAggregatedScript.mock.invocationCallOrder[0];
      const ttsOrder = mockSynthesizeScript.mock.invocationCallOrder[0];
      const uploadOrder = mockUploadFile.mock.invocationCallOrder[0];
      const podcastOrder = mockPodcastCreate.mock.invocationCallOrder[0];
      const publishOrder = mockPublishToChannels.mock.invocationCallOrder[0];

      expect(fetchOrder).toBeLessThan(filterOrder);
      expect(filterOrder).toBeLessThan(scriptOrder);
      expect(scriptOrder).toBeLessThan(ttsOrder);
      expect(ttsOrder).toBeLessThan(uploadOrder);
      expect(uploadOrder).toBeLessThan(podcastOrder);
      expect(podcastOrder).toBeLessThan(publishOrder);
    });

    it("creates Podcast with correct data from pipeline", async () => {
      await executeJob(jobConfig);

      expect(mockPodcastCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-e2e-1",
          sourceType: "job",
          status: "completed",
          audioUrl: "https://r2.example.com/podcasts/user-e2e-1/job-e2e-1.mp3",
          duration: 842.3,
          jobRunId: "run-e2e-1",
          script: JSON.parse(JSON.stringify(testScript)),
        }),
      });
    });

    it("passes correct data through each pipeline stage", async () => {
      await executeJob(jobConfig);

      // Sources receive the configured sources
      expect(mockFetchSources).toHaveBeenCalledWith(jobConfig.sources);

      // Filter receives articles + config + jobId + maxArticles
      expect(mockFilterPipeline).toHaveBeenCalledWith(
        testArticles,
        jobConfig.filterConfig,
        "job-e2e-1",
        5 // maxArticles
      );

      // Script generation receives selected articles + generation options
      expect(mockGenerateAggregatedScript).toHaveBeenCalledWith(
        testArticles,
        expect.objectContaining({
          stylePreset: "news_brief",
          targetMinutes: 15,
        })
      );

      // TTS receives the generated script + voice IDs
      expect(mockSynthesizeScript).toHaveBeenCalledWith(
        {}, // TTS provider instance
        testScript,
        "voice-cloned-1", // voiceId from config
        undefined // voiceBId from env (not set in test)
      );

      // Concat receives all audio segments
      expect(mockConcatAudioSegments).toHaveBeenCalledWith([
        Buffer.from("seg-1"),
        Buffer.from("seg-2"),
        Buffer.from("seg-3"),
        Buffer.from("seg-4"),
      ]);

      // Upload receives the concatenated audio
      expect(mockUploadFile).toHaveBeenCalledWith(
        expect.stringContaining("podcasts/user-e2e-1/job-"),
        Buffer.from("final-audio-e2e"),
        "audio/mpeg"
      );
    });

    it("records processed articles for deduplication", async () => {
      await executeJob(jobConfig);

      expect(mockJobArticleCreateMany).toHaveBeenCalledWith({
        data: testSelectedMeta.map((a) => ({
          jobId: "job-e2e-1",
          url: a.url,
          title: a.title,
        })),
        skipDuplicates: true,
      });
    });

    it("updates JobRun status to completed with podcastId", async () => {
      await executeJob(jobConfig);

      // Find the final update call (status: completed)
      const completedCall = mockJobRunUpdate.mock.calls.find(
        (call) => call[0]?.data?.status === "completed"
      );

      expect(completedCall).toBeDefined();
      expect(completedCall![0]).toEqual(
        expect.objectContaining({
          where: { id: "run-e2e-1" },
          data: expect.objectContaining({
            status: "completed",
            podcastId: "podcast-e2e-1",
          }),
        })
      );
    });

    it("updates nextRunAt and lastRunAt in finally block", async () => {
      await executeJob(jobConfig);

      expect(mockJobUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "job-e2e-1" },
          data: expect.objectContaining({
            lastRunAt: expect.any(Date),
            nextRunAt: new Date("2026-02-20T00:00:00Z"),
          }),
        })
      );
    });

    it("publishes to output channels with correct podcast info", async () => {
      await executeJob(jobConfig);

      expect(mockPublishToChannels).toHaveBeenCalledWith(
        jobConfig.outputConfig,
        expect.objectContaining({
          audioUrl: "https://r2.example.com/podcasts/user-e2e-1/job-e2e-1.mp3",
          durationMs: 842300, // 842.3 * 1000 rounded
        })
      );
    });
  });

  describe("Worker → Pipeline integration", () => {
    it("worker finds due job and dispatches to pipeline", async () => {
      const dueJob = {
        ...jobConfig,
        status: "active",
        nextRunAt: new Date("2026-02-19T00:00:00Z"),
      };
      mockJobFindMany.mockResolvedValue([dueJob]);

      await checkDueJobs();

      // Worker should query for active jobs with nextRunAt <= now
      expect(mockJobFindMany).toHaveBeenCalledWith({
        where: {
          status: "active",
          nextRunAt: { lte: expect.any(Date) },
        },
      });
    });

    it("worker skips job with in-progress run (concurrent guard)", async () => {
      const dueJob = {
        ...jobConfig,
        status: "active",
        nextRunAt: new Date("2026-02-19T00:00:00Z"),
      };
      mockJobFindMany.mockResolvedValue([dueJob]);
      mockJobRunFindFirst.mockResolvedValue({ id: "run-old", status: "generating_script" });

      await checkDueJobs();

      // hasInProgressRun returns true → executeJob should NOT be called
      // Note: executeJob is called via the real import, so we check that
      // no jobRun.create was called (which is the first thing executeJob does)
      expect(mockJobRunCreate).not.toHaveBeenCalled();
    });
  });

  describe("Quota exhaustion scenarios", () => {
    it("fails immediately and pauses job when quota is already exhausted", async () => {
      mockCheckUsageLimit.mockResolvedValue({ allowed: false, used: 10, limit: 10, plan: "pro" });

      await executeJob(jobConfig);

      // Should NOT proceed past quota check
      expect(mockFetchSources).not.toHaveBeenCalled();
      expect(mockFilterPipeline).not.toHaveBeenCalled();
      expect(mockGenerateAggregatedScript).not.toHaveBeenCalled();

      // Should pause the job
      expect(mockJobUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "job-e2e-1" },
          data: expect.objectContaining({ status: "paused" }),
        })
      );

      // Should mark run as failed with quota error
      expect(mockJobRunUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "failed",
            errorMessage: "quota_exhausted",
          }),
        })
      );
    });

    it("auto-pauses all user jobs when quota exhausted after podcast creation", async () => {
      // First check passes, second check (after increment) fails
      mockCheckUsageLimit
        .mockResolvedValueOnce({ allowed: true, used: 9, limit: 10, plan: "pro" })
        .mockResolvedValueOnce({ allowed: false, used: 10, limit: 10, plan: "pro" });

      await executeJob(jobConfig);

      // Pipeline should complete (podcast created)
      expect(mockPodcastCreate).toHaveBeenCalled();
      expect(mockIncrementUsage).toHaveBeenCalledWith("user-e2e-1");

      // Should pause ALL active jobs for this user
      expect(mockJobUpdateMany).toHaveBeenCalledWith({
        where: { userId: "user-e2e-1", status: "active" },
        data: { status: "paused" },
      });
    });
  });

  describe("No content scenarios", () => {
    it("skips run when sources return no articles", async () => {
      mockFetchSources.mockResolvedValue([]);
      mockFilterPipeline.mockResolvedValue({ selected: [], selectedMeta: [] });

      await executeJob(jobConfig);

      // Should mark as skipped
      expect(mockJobRunUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "skipped" }),
        })
      );

      // Should NOT attempt script generation or audio synthesis
      expect(mockGenerateAggregatedScript).not.toHaveBeenCalled();
      expect(mockSynthesizeScript).not.toHaveBeenCalled();
      expect(mockPodcastCreate).not.toHaveBeenCalled();
    });

    it("skips run when all articles are filtered out (dedup/keywords)", async () => {
      mockFetchSources.mockResolvedValue(testArticles);
      mockFilterPipeline.mockResolvedValue({ selected: [], selectedMeta: [] });

      await executeJob(jobConfig);

      // Sources were fetched but everything was filtered
      expect(mockFetchSources).toHaveBeenCalled();
      expect(mockFilterPipeline).toHaveBeenCalled();

      // Should skip
      expect(mockJobRunUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "skipped" }),
        })
      );
      expect(mockGenerateAggregatedScript).not.toHaveBeenCalled();
    });
  });

  describe("Error recovery", () => {
    it("handles source fetch failure gracefully", async () => {
      mockFetchSources.mockRejectedValue(new Error("DNS resolution failed"));

      await executeJob(jobConfig);

      // Run should be failed
      expect(mockJobRunUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "failed",
            errorMessage: "DNS resolution failed",
          }),
        })
      );

      // nextRunAt should still be updated (in finally block)
      expect(mockJobUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastRunAt: expect.any(Date),
            nextRunAt: expect.any(Date),
          }),
        })
      );
    });

    it("handles LLM API failure", async () => {
      mockGenerateAggregatedScript.mockRejectedValue(new Error("Claude API rate limited"));

      await executeJob(jobConfig);

      expect(mockJobRunUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "failed",
            errorMessage: "Claude API rate limited",
          }),
        })
      );

      // Should NOT proceed to TTS
      expect(mockSynthesizeScript).not.toHaveBeenCalled();
    });

    it("handles TTS synthesis failure", async () => {
      mockSynthesizeScript.mockRejectedValue(new Error("ElevenLabs quota exceeded"));

      await executeJob(jobConfig);

      expect(mockJobRunUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "failed",
            errorMessage: "ElevenLabs quota exceeded",
          }),
        })
      );

      expect(mockUploadFile).not.toHaveBeenCalled();
    });

    it("handles R2 upload failure", async () => {
      mockUploadFile.mockRejectedValue(new Error("R2 storage unavailable"));

      await executeJob(jobConfig);

      expect(mockJobRunUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "failed",
            errorMessage: "R2 storage unavailable",
          }),
        })
      );

      expect(mockPodcastCreate).not.toHaveBeenCalled();
    });

    it("completes successfully even when channel delivery fails", async () => {
      mockPublishToChannels.mockResolvedValue([
        { type: "telegram", success: false, error: "Bot was blocked by user" },
      ]);

      await executeJob(jobConfig);

      // Pipeline should still be marked as completed
      expect(mockJobRunUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "completed",
            podcastId: "podcast-e2e-1",
          }),
        })
      );
    });
  });

  describe("Multi-channel delivery", () => {
    it("delivers to both Telegram and LINE channels", async () => {
      const multiChannelConfig = {
        ...jobConfig,
        outputConfig: [
          { type: "telegram" as const, chatId: "tg-123", format: "audio" as const },
          {
            type: "line" as const,
            channelAccessToken: "encrypted-token",
            lineUserIds: ["line-user-1"],
            format: "both" as const,
          },
        ],
      };

      mockPublishToChannels.mockResolvedValue([
        { type: "telegram", success: true },
        { type: "line", success: true },
      ]);

      await executeJob(multiChannelConfig);

      expect(mockPublishToChannels).toHaveBeenCalledWith(
        multiChannelConfig.outputConfig,
        expect.objectContaining({
          audioUrl: expect.any(String),
          title: expect.any(String),
        })
      );
    });

    it("continues when one channel fails but other succeeds", async () => {
      const multiChannelConfig = {
        ...jobConfig,
        outputConfig: [
          { type: "telegram" as const, chatId: "tg-123", format: "audio" as const },
          {
            type: "line" as const,
            channelAccessToken: "enc-token",
            lineUserIds: ["u1"],
            format: "link" as const,
          },
        ],
      };

      mockPublishToChannels.mockResolvedValue([
        { type: "telegram", success: true },
        { type: "line", success: false, error: "Invalid token" },
      ]);

      await executeJob(multiChannelConfig);

      // Still completed
      expect(mockJobRunUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "completed" }),
        })
      );
    });
  });

  describe("Concurrent execution guard", () => {
    it("hasInProgressRun checks for active run statuses", async () => {
      mockJobRunFindFirst.mockResolvedValue({
        id: "run-old",
        status: "generating_audio",
      });

      const result = await hasInProgressRun("job-e2e-1");
      expect(result).toBe(true);

      expect(mockJobRunFindFirst).toHaveBeenCalledWith({
        where: {
          jobId: "job-e2e-1",
          status: {
            in: [
              "pending",
              "fetching",
              "filtering",
              "generating_script",
              "generating_audio",
              "publishing",
            ],
          },
        },
      });
    });

    it("allows execution when no in-progress run exists", async () => {
      mockJobRunFindFirst.mockResolvedValue(null);

      const result = await hasInProgressRun("job-e2e-1");
      expect(result).toBe(false);
    });
  });

  describe("State transition tracking", () => {
    it("JobRun transitions through all status stages", async () => {
      await executeJob(jobConfig);

      // Collect all status updates from jobRun.update calls
      const statusUpdates = mockJobRunUpdate.mock.calls
        .map((call) => call[0]?.data?.status)
        .filter(Boolean);

      // Should see intermediate statuses + final completed
      expect(statusUpdates).toContain("fetching");
      expect(statusUpdates).toContain("filtering");
      expect(statusUpdates).toContain("generating_script");
      expect(statusUpdates).toContain("generating_audio");
      expect(statusUpdates).toContain("publishing");
      expect(statusUpdates).toContain("completed");

      // completed should be the last status
      expect(statusUpdates[statusUpdates.length - 1]).toBe("completed");
    });
  });
});
