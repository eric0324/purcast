import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { createLLMProvider } from "@/lib/llm/provider";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { errorKey: "unauthorized" },
        { status: 401 }
      );
    }

    const { podcastId } = await request.json();

    if (!podcastId) {
      return NextResponse.json(
        { errorKey: "script.podcastIdRequired" },
        { status: 400 }
      );
    }

    const podcast = await prisma.podcast.findUnique({
      where: { id: podcastId },
    });

    if (!podcast || podcast.userId !== user.id) {
      return NextResponse.json(
        { errorKey: "script.podcastNotFound" },
        { status: 404 }
      );
    }

    if (podcast.status === "script_ready") {
      return NextResponse.json({ script: podcast.script });
    }

    if (podcast.status === "generating_script") {
      return NextResponse.json(
        { errorKey: "script.alreadyGenerating" },
        { status: 409 }
      );
    }

    // Set status to generating
    await prisma.podcast.update({
      where: { id: podcastId },
      data: { status: "generating_script" },
    });

    try {
      const provider = createLLMProvider();
      const result = await provider.generateScript(podcast.sourceContent);

      await prisma.podcast.update({
        where: { id: podcastId },
        data: {
          script: JSON.parse(JSON.stringify(result.dialogue)),
          status: "script_ready",
          ...(result.title && { title: result.title }),
        },
      });

      return NextResponse.json({ status: "script_ready" });
    } catch (llmError) {
      await prisma.podcast.update({
        where: { id: podcastId },
        data: {
          status: "failed",
          errorMessage:
            llmError instanceof Error ? llmError.message : "Unknown error",
        },
      });

      return NextResponse.json({ status: "failed" });
    }
  } catch {
    return NextResponse.json(
      { errorKey: "script.generateFailed" },
      { status: 500 }
    );
  }
}
