import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

interface RouteParams {
  params: Promise<{ id: string; runId: string }>;
}

// GET: Run detail with selectedArticles
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id, runId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await prisma.jobRun.findUnique({
    where: { id: runId },
    include: {
      job: { select: { userId: true } },
      podcast: {
        select: {
          id: true,
          title: true,
          audioUrl: true,
          duration: true,
        },
      },
    },
  });

  if (!run || run.job.userId !== user.id || run.jobId !== id) {
    return NextResponse.json({ errorKey: "jobs.runNotFound" }, { status: 404 });
  }

  return NextResponse.json({ run });
}
