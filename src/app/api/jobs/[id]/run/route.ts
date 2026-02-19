import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { checkUsageLimit } from "@/lib/billing/usage";
import { executeJob, hasInProgressRun } from "@/lib/jobs/pipeline";
import type {
  JobSource,
  JobSchedule,
  JobFilterConfig,
  JobGenerationConfig,
  JobOutputConfig,
} from "@/lib/jobs/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST: Trigger immediate job execution
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ errorKey: "jobs.notFound" }, { status: 404 });
  }

  // Check quota
  const usage = await checkUsageLimit(user.id);
  if (!usage.allowed) {
    return NextResponse.json(
      { errorKey: "jobs.quotaExhausted" },
      { status: 403 }
    );
  }

  // Check if already running
  const running = await hasInProgressRun(id);
  if (running) {
    return NextResponse.json(
      { errorKey: "jobs.alreadyRunning" },
      { status: 409 }
    );
  }

  // Fire and forget — don't await the full pipeline
  executeJob({
    id: job.id,
    userId: job.userId,
    sources: job.sources as unknown as JobSource[],
    schedule: job.schedule as unknown as JobSchedule,
    filterConfig: job.filterConfig as unknown as JobFilterConfig,
    generationConfig: job.generationConfig as unknown as JobGenerationConfig,
    outputConfig: job.outputConfig as unknown as JobOutputConfig[],
  }).catch((err) => {
    console.error(`[RunNow] Job ${id} failed:`, err);
  });

  return NextResponse.json({ triggered: true });
}
