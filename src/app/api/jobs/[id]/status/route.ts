import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { checkUsageLimit } from "@/lib/billing/usage";
import { calculateNextRunAt } from "@/lib/jobs/schedule";
import type { JobSchedule } from "@/lib/jobs/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH: Activate or pause a job
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ errorKey: "jobs.notFound" }, { status: 404 });
  }

  const body = await request.json();
  const { status } = body;

  if (!status || !["active", "paused"].includes(status)) {
    return NextResponse.json(
      { errorKey: "jobs.invalidStatus" },
      { status: 400 }
    );
  }

  // If activating, check quota
  if (status === "active") {
    const usage = await checkUsageLimit(user.id);
    if (!usage.allowed) {
      return NextResponse.json(
        { errorKey: "jobs.quotaExhausted" },
        { status: 403 }
      );
    }

    // Recalculate next run time
    const schedule = job.schedule as unknown as JobSchedule;
    const nextRunAt = calculateNextRunAt(schedule);

    const updated = await prisma.job.update({
      where: { id },
      data: { status: "active", nextRunAt },
    });

    return NextResponse.json({ job: updated });
  }

  // Pausing
  const updated = await prisma.job.update({
    where: { id },
    data: { status: "paused" },
  });

  return NextResponse.json({ job: updated });
}
