import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { verifyLineSignature } from "@/lib/jobs/outputs/line";
// Local type for LINE output config (kept for future restoration)
interface LineOutputConfig {
  type: "line";
  channelAccessToken: string;
  lineUserIds: string[];
  format: string;
}

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params;

  try {
    // Find the job and get the LINE output config
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const outputConfigs = job.outputConfig as unknown as LineOutputConfig[];
    const lineConfig = outputConfigs.find((c: LineOutputConfig) => c.type === "line");

    if (!lineConfig) {
      return NextResponse.json(
        { error: "LINE not configured for this job" },
        { status: 400 }
      );
    }

    // Verify LINE signature
    const body = await request.text();
    const signature = request.headers.get("x-line-signature") || "";
    const channelSecret = process.env.LINE_CHANNEL_SECRET || "";

    if (channelSecret && !verifyLineSignature(body, signature, channelSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const payload = JSON.parse(body);
    const events = payload.events || [];

    for (const event of events) {
      // Handle follow events (user adds OA as friend)
      if (event.type === "follow" && event.source?.userId) {
        const lineUserId = event.source.userId;

        // Add userId to the LINE config's lineUserIds if not already present
        if (!lineConfig.lineUserIds.includes(lineUserId)) {
          lineConfig.lineUserIds.push(lineUserId);

          // Update the job's outputConfig
          const updatedConfigs = outputConfigs.map((c: LineOutputConfig) =>
            c.type === "line" ? lineConfig : c
          );

          await prisma.job.update({
            where: { id: jobId },
            data: {
              outputConfig: JSON.parse(JSON.stringify(updatedConfigs)),
            },
          });
        }
      }

      // Handle unfollow events (user blocks/removes OA)
      if (event.type === "unfollow" && event.source?.userId) {
        const lineUserId = event.source.userId;
        lineConfig.lineUserIds = lineConfig.lineUserIds.filter(
          (id: string) => id !== lineUserId
        );

        const updatedConfigs = outputConfigs.map((c) =>
          c.type === "line" ? lineConfig : c
        );

        await prisma.job.update({
          where: { id: jobId },
          data: {
            outputConfig: JSON.parse(JSON.stringify(updatedConfigs)),
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[LINE Webhook] Error:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to LINE
  }
}
