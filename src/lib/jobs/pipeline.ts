import { prisma } from "@/lib/db/client";
import { fetchSources } from "./sources";
import { filterPipeline } from "./filtering";
import { generateAggregatedScript } from "@/lib/llm/aggregate";
import { createTTSProvider } from "@/lib/tts/provider";
import { synthesizeScript } from "@/lib/tts/synthesize-script";
import { concatAudioSegments } from "@/lib/audio/concat";
import { getAudioDuration } from "@/lib/audio/duration";
import { uploadFile } from "@/lib/r2/utils";
import { publishToChannels, type PodcastInfo } from "./outputs";
import { checkUsageLimit, incrementUsage } from "@/lib/billing/usage";
import { calculateNextRunAt } from "./schedule";
import type {
  JobSource,
  JobSchedule,
  JobFilterConfig,
  JobGenerationConfig,
  JobOutputConfig,
  SelectedArticle,
} from "./types";
import { writeFileSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";

interface JobData {
  id: string;
  userId: string;
  sources: JobSource[];
  schedule: JobSchedule;
  filterConfig: JobFilterConfig;
  generationConfig: JobGenerationConfig;
  outputConfig: JobOutputConfig[];
}

export async function executeJob(jobData: JobData): Promise<void> {
  // Create a JobRun record
  const run = await prisma.jobRun.create({
    data: {
      jobId: jobData.id,
      status: "pending",
    },
  });

  try {
    // Step 1: Quota check
    const usageResult = await checkUsageLimit(jobData.userId);
    if (!usageResult.allowed) {
      await prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          errorMessage: "quota_exhausted",
          completedAt: new Date(),
        },
      });
      await prisma.job.update({
        where: { id: jobData.id },
        data: { status: "paused" },
      });
      return;
    }

    // Step 2: Fetch sources
    await updateRunStatus(run.id, "fetching");
    const articles = await fetchSources(jobData.sources);

    // Step 3: Filter
    await updateRunStatus(run.id, "filtering");
    const filterResult = await filterPipeline(
      articles,
      jobData.filterConfig,
      jobData.id,
      jobData.generationConfig.maxArticles
    );

    // Update articles counts
    await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        articlesFound: articles.length,
        articlesSelected: filterResult.selected.length,
        selectedArticles: JSON.parse(JSON.stringify(filterResult.selectedMeta)),
      },
    });

    // Skip if no articles
    if (filterResult.selected.length === 0) {
      await prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: "skipped",
          completedAt: new Date(),
        },
      });
      return;
    }

    // Step 4: Generate aggregated script
    await updateRunStatus(run.id, "generating_script");
    const scriptResult = await generateAggregatedScript(filterResult.selected, {
      stylePreset: jobData.generationConfig.stylePreset,
      customPrompt: jobData.generationConfig.customPrompt,
      targetMinutes: jobData.generationConfig.targetMinutes,
    });

    // Step 5: Synthesize audio
    await updateRunStatus(run.id, "generating_audio");
    const tts = createTTSProvider();
    const defaultVoiceA =
      process.env.FISH_AUDIO_DEFAULT_VOICE_A || process.env.ELEVENLABS_DEFAULT_VOICE_A!;
    const voiceAId = jobData.generationConfig.voiceId || defaultVoiceA;
    const voiceBId =
      process.env.FISH_AUDIO_DEFAULT_VOICE_B || process.env.ELEVENLABS_DEFAULT_VOICE_B!;

    const segments = await synthesizeScript(
      tts,
      scriptResult.dialogue,
      voiceAId,
      voiceBId
    );

    // Concat segments
    const finalAudio = await concatAudioSegments(segments);

    // Get duration
    const tmpPath = `/tmp/purcast-job-${randomUUID()}.mp3`;
    writeFileSync(tmpPath, finalAudio);
    let duration: number;
    try {
      duration = await getAudioDuration(tmpPath);
    } finally {
      try {
        unlinkSync(tmpPath);
      } catch {
        // Ignore
      }
    }

    // Upload to R2
    const r2Key = `podcasts/${jobData.userId}/job-${jobData.id}-${run.id}.mp3`;
    const audioUrl = await uploadFile(r2Key, finalAudio, "audio/mpeg");

    // Create Podcast record
    const title = buildPodcastTitle(filterResult.selectedMeta);
    const sourceContent = filterResult.selectedMeta
      .map((a) => `${a.title}\n${a.url}`)
      .join("\n\n");
    const podcast = await prisma.podcast.create({
      data: {
        userId: jobData.userId,
        title,
        sourceType: "job",
        sourceContent,
        sourceUrl: null,
        script: JSON.parse(JSON.stringify(scriptResult.dialogue)),
        status: "completed",
        audioUrl,
        duration,
        jobRunId: run.id,
      },
    });

    // Increment usage and auto-pause if quota exhausted
    await incrementUsage(jobData.userId);
    await autoPauseIfQuotaExhausted(jobData.userId);

    // Step 6: Publish to output channels
    await updateRunStatus(run.id, "publishing");
    const playbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/history/${podcast.id}`;

    const podcastInfo: PodcastInfo = {
      title,
      summary: buildSummary(filterResult.selectedMeta),
      playbackUrl,
      audioUrl,
      durationMs: Math.round(duration * 1000),
    };

    const channelResults = await publishToChannels(
      jobData.outputConfig,
      podcastInfo
    );

    // Log channel results
    const failedChannels = channelResults.filter((r) => !r.success);
    if (failedChannels.length > 0) {
      console.warn(
        `[Pipeline] Some channels failed for job ${jobData.id}:`,
        failedChannels
      );
    }

    // Step 7: Record completed
    await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        podcastId: podcast.id,
        completedAt: new Date(),
      },
    });

    // Record processed articles for dedup
    await recordArticles(jobData.id, filterResult.selectedMeta);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`[Pipeline] Job ${jobData.id} failed:`, message);

    await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        errorMessage: message,
        completedAt: new Date(),
      },
    });
  } finally {
    // Always update next_run_at and last_run_at
    const nextRunAt = calculateNextRunAt(jobData.schedule);
    await prisma.job.update({
      where: { id: jobData.id },
      data: {
        lastRunAt: new Date(),
        nextRunAt,
      },
    });
  }
}

export async function hasInProgressRun(jobId: string): Promise<boolean> {
  const inProgress = await prisma.jobRun.findFirst({
    where: {
      jobId,
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
  return inProgress !== null;
}

async function updateRunStatus(runId: string, status: string): Promise<void> {
  await prisma.jobRun.update({
    where: { id: runId },
    data: { status },
  });
}

async function recordArticles(
  jobId: string,
  articles: SelectedArticle[]
): Promise<void> {
  await prisma.jobArticle.createMany({
    data: articles.map((a) => ({
      jobId,
      url: a.url,
      title: a.title,
    })),
    skipDuplicates: true,
  });
}

async function autoPauseIfQuotaExhausted(userId: string): Promise<void> {
  const usage = await checkUsageLimit(userId);
  if (!usage.allowed) {
    // Pause all active jobs for this user
    await prisma.job.updateMany({
      where: { userId, status: "active" },
      data: { status: "paused" },
    });
    console.log(`[Pipeline] Auto-paused all active jobs for user ${userId} (quota exhausted)`);
  }
}

function buildPodcastTitle(articles: SelectedArticle[]): string {
  if (articles.length === 1) return articles[0].title;
  const date = new Date().toISOString().slice(0, 10);
  return `Daily Digest — ${date}`;
}

function buildSummary(articles: SelectedArticle[]): string {
  return articles.map((a) => `• ${a.title}`).join("\n");
}
