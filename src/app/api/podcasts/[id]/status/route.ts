import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function GET(
  _request: NextRequest,
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

    const podcast = await prisma.podcast.findUnique({
      where: { id },
      select: { userId: true, status: true, errorMessage: true },
    });

    if (!podcast || podcast.userId !== user.id) {
      return NextResponse.json(
        { errorKey: "script.podcastNotFound" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: podcast.status,
      errorMessage: podcast.errorMessage,
    });
  } catch {
    return NextResponse.json(
      { errorKey: "script.podcastNotFound" },
      { status: 500 }
    );
  }
}
