import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { calculateNextRunAt } from "@/lib/jobs/schedule";
import type {
  JobSource,
  JobSchedule,
  JobGenerationConfig,
  JobChannelBinding,
} from "@/lib/jobs/types";
import { HARD_LIMITS } from "@/lib/config/plan";

// GET: List user's jobs
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await prisma.job.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
        },
      },
    },
  });

  return NextResponse.json({ jobs });
}

// POST: Create a new job
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, sources, schedule, filterConfig, generationConfig, outputConfig } = body;

  // Validate required fields
  if (!name || !sources || !schedule || !generationConfig || !outputConfig) {
    return NextResponse.json(
      { errorKey: "jobs.missingRequiredFields" },
      { status: 400 }
    );
  }

  // Validate sources
  if (!Array.isArray(sources) || sources.length === 0) {
    return NextResponse.json(
      { errorKey: "jobs.sourcesRequired" },
      { status: 400 }
    );
  }

  for (const source of sources as JobSource[]) {
    if (!source.type || !source.url) {
      return NextResponse.json(
        { errorKey: "jobs.invalidSource" },
        { status: 400 }
      );
    }
    if (!["rss", "url", "reddit"].includes(source.type)) {
      return NextResponse.json(
        { errorKey: "jobs.invalidSourceType" },
        { status: 400 }
      );
    }
    if (source.type === "reddit") {
      // Reddit sources accept subreddit names, r/name, or full URLs
      if (!/^[a-zA-Z0-9_]+$/.test(source.url) &&
          !source.url.match(/^r\/[a-zA-Z0-9_]+$/) &&
          !source.url.match(/reddit\.com\/r\/[a-zA-Z0-9_]+/)) {
        return NextResponse.json(
          { errorKey: "jobs.invalidSource" },
          { status: 400 }
        );
      }
    } else {
      try {
        new URL(source.url);
      } catch {
        return NextResponse.json(
          { errorKey: "jobs.invalidSourceUrl" },
          { status: 400 }
        );
      }
    }
  }

  // Validate schedule
  const sched = schedule as JobSchedule;
  if (!["daily", "weekly"].includes(sched.mode) || !sched.time || !sched.timezone) {
    return NextResponse.json(
      { errorKey: "jobs.invalidSchedule" },
      { status: 400 }
    );
  }

  // Validate generation config
  const genConfig = generationConfig as JobGenerationConfig;
  if (!genConfig.stylePreset) {
    return NextResponse.json(
      { errorKey: "jobs.invalidGenerationConfig" },
      { status: 400 }
    );
  }

  // Enforce hard limits
  if (genConfig.targetMinutes) {
    genConfig.targetMinutes = Math.min(genConfig.targetMinutes, HARD_LIMITS.targetMinutesMax);
  }
  if (genConfig.maxArticles) {
    genConfig.maxArticles = Math.min(genConfig.maxArticles, HARD_LIMITS.maxArticles);
  }

  // Validate AI filter prompt length
  if (filterConfig?.aiPrompt && filterConfig.aiPrompt.length > HARD_LIMITS.aiPromptMaxLength) {
    filterConfig.aiPrompt = filterConfig.aiPrompt.slice(0, HARD_LIMITS.aiPromptMaxLength);
  }

  // Validate output config (channel bindings)
  if (!Array.isArray(outputConfig) || outputConfig.length === 0) {
    return NextResponse.json(
      { errorKey: "jobs.outputRequired" },
      { status: 400 }
    );
  }

  // Validate that all channelIds exist and belong to the user
  const channelIds = (outputConfig as JobChannelBinding[]).map((b) => b.channelId);
  const validChannels = await prisma.channel.findMany({
    where: { id: { in: channelIds }, userId: user.id },
    select: { id: true },
  });
  const validIds = new Set(validChannels.map((c) => c.id));
  for (const cid of channelIds) {
    if (!validIds.has(cid)) {
      return NextResponse.json(
        { errorKey: "channels.notFound" },
        { status: 400 }
      );
    }
  }

  // Calculate next run time
  const nextRunAt = calculateNextRunAt(sched);

  const job = await prisma.job.create({
    data: {
      userId: user.id,
      name,
      status: "paused", // Start paused, user activates explicitly
      sources: JSON.parse(JSON.stringify(sources)),
      schedule: JSON.parse(JSON.stringify(schedule)),
      filterConfig: JSON.parse(JSON.stringify(filterConfig || {})),
      generationConfig: JSON.parse(JSON.stringify(generationConfig)),
      outputConfig: JSON.parse(JSON.stringify(outputConfig)),
      nextRunAt,
    },
  });

  return NextResponse.json({ job }, { status: 201 });
}
