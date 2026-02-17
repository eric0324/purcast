import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

const MAX_CHARS_PER_LINE = 500;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { errorKey: "unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { script } = await request.json();

    const podcast = await prisma.podcast.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!podcast || podcast.userId !== user.id) {
      return NextResponse.json(
        { errorKey: "script.podcastNotFound" },
        { status: 404 }
      );
    }

    if (!Array.isArray(script) || script.length === 0) {
      return NextResponse.json(
        { errorKey: "script.invalidScript" },
        { status: 400 }
      );
    }

    for (const line of script) {
      if (line.speaker !== "A" && line.speaker !== "B") {
        return NextResponse.json(
          { errorKey: "script.invalidSpeaker" },
          { status: 400 }
        );
      }

      if (
        typeof line.text !== "string" ||
        line.text.length > MAX_CHARS_PER_LINE
      ) {
        return NextResponse.json(
          { errorKey: "script.lineTooLong" },
          { status: 400 }
        );
      }
    }

    await prisma.podcast.update({
      where: { id },
      data: { script, status: "script_ready" },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { errorKey: "script.saveFailed" },
      { status: 500 }
    );
  }
}
