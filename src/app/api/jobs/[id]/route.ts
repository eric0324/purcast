import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { calculateNextRunAt } from "@/lib/jobs/schedule";
import type { JobSchedule } from "@/lib/jobs/types";
import { HARD_LIMITS } from "@/lib/config/plan";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Job detail with recent runs
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          articlesFound: true,
          articlesSelected: true,
          errorMessage: true,
          startedAt: true,
          completedAt: true,
          podcastId: true,
        },
      },
    },
  });

  if (!job || job.userId !== user.id) {
    return NextResponse.json({ errorKey: "jobs.notFound" }, { status: 404 });
  }

  return NextResponse.json({ job });
}

// PUT: Update job
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ errorKey: "jobs.notFound" }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.sources !== undefined) updateData.sources = JSON.parse(JSON.stringify(body.sources));
  if (body.filterConfig !== undefined) {
    const fc = body.filterConfig;
    if (fc.aiPrompt && fc.aiPrompt.length > HARD_LIMITS.aiPromptMaxLength) {
      fc.aiPrompt = fc.aiPrompt.slice(0, HARD_LIMITS.aiPromptMaxLength);
    }
    updateData.filterConfig = JSON.parse(JSON.stringify(fc));
  }
  if (body.generationConfig !== undefined) {
    const gc = body.generationConfig;
    if (gc.targetMinutes) gc.targetMinutes = Math.min(gc.targetMinutes, HARD_LIMITS.targetMinutesMax);
    if (gc.maxArticles) gc.maxArticles = Math.min(gc.maxArticles, HARD_LIMITS.maxArticles);
    updateData.generationConfig = JSON.parse(JSON.stringify(gc));
  }
  if (body.outputConfig !== undefined) updateData.outputConfig = JSON.parse(JSON.stringify(body.outputConfig));

  // If schedule changed, recalculate nextRunAt
  if (body.schedule !== undefined) {
    updateData.schedule = JSON.parse(JSON.stringify(body.schedule));
    updateData.nextRunAt = calculateNextRunAt(body.schedule as JobSchedule);
  }

  try {
    const job = await prisma.job.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ job });
  } catch (error) {
    console.error("[Jobs PUT] Update failed:", error);
    return NextResponse.json(
      { errorKey: "jobs.updateFailed" },
      { status: 500 }
    );
  }
}

// DELETE: Delete job (cascades to runs and articles)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ errorKey: "jobs.notFound" }, { status: 404 });
  }

  await prisma.job.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
