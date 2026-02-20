import "dotenv/config";
import cron from "node-cron";
import { prisma } from "@/lib/db/client";
import { executeJob, hasInProgressRun } from "@/lib/jobs/pipeline";
import type {
  JobSource,
  JobSchedule,
  JobFilterConfig,
  JobGenerationConfig,
  JobChannelBinding,
} from "@/lib/jobs/types";

export async function checkDueJobs(): Promise<void> {
  const now = new Date();

  const dueJobs = await prisma.job.findMany({
    where: {
      status: "active",
      nextRunAt: { lte: now },
    },
  });

  if (dueJobs.length === 0) return;

  console.log(`[Worker] Found ${dueJobs.length} due job(s)`);

  for (const job of dueJobs) {
    // Concurrent guard
    const isRunning = await hasInProgressRun(job.id);
    if (isRunning) {
      console.log(`[Worker] Job ${job.id} already running, skipping`);
      continue;
    }

    // Fire-and-forget (don't block the cron tick)
    executeJob({
      id: job.id,
      userId: job.userId,
      sources: job.sources as unknown as JobSource[],
      schedule: job.schedule as unknown as JobSchedule,
      filterConfig: job.filterConfig as unknown as JobFilterConfig,
      generationConfig: job.generationConfig as unknown as JobGenerationConfig,
      outputConfig: job.outputConfig as unknown as JobChannelBinding[],
    }).catch((error) => {
      console.error(`[Worker] Unhandled error in job ${job.id}:`, error);
    });
  }
}

function startWorker(): void {
  console.log("[Worker] Starting job scheduler worker...");

  // Run every minute
  cron.schedule("* * * * *", () => {
    checkDueJobs().catch((error) => {
      console.error("[Worker] Error checking due jobs:", error);
    });
  });

  // Run immediately on startup to catch overdue jobs
  checkDueJobs().catch((error) => {
    console.error("[Worker] Error on initial check:", error);
  });

  console.log("[Worker] Worker started. Checking for due jobs every minute.");
}

// Only start if this is the main module (not imported for testing)
if (process.argv[1]?.endsWith("worker.ts") || process.argv[1]?.endsWith("worker.js")) {
  startWorker();
}
