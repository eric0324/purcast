import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { deleteFile } from "@/lib/r2/utils";
import { createTTSProvider } from "@/lib/tts/provider";
import { checkFeatureAccess } from "@/lib/billing/feature-gate";

export async function PATCH(
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
    const { name } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { errorKey: "voice.nameRequired" },
        { status: 400 }
      );
    }

    const voice = await prisma.voice.findUnique({
      where: { id },
    });

    if (!voice || voice.userId !== user.id) {
      return NextResponse.json(
        { errorKey: "voice.notFound" },
        { status: 404 }
      );
    }

    const updated = await prisma.voice.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json({ voice: updated });
  } catch {
    return NextResponse.json(
      { errorKey: "voice.updateFailed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const hasAccess = await checkFeatureAccess(user.id, "voice-clone");
    if (!hasAccess) {
      return NextResponse.json(
        { errorKey: "feature.proOnly" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const voice = await prisma.voice.findUnique({
      where: { id },
    });

    if (!voice || voice.userId !== user.id) {
      return NextResponse.json(
        { errorKey: "voice.notFound" },
        { status: 404 }
      );
    }

    // Delete from ElevenLabs (best-effort)
    try {
      const tts = createTTSProvider();
      await tts.deleteVoice(voice.elevenlabsVoiceId);
    } catch {
      // Continue even if ElevenLabs delete fails
    }

    // Delete from database
    await prisma.voice.delete({ where: { id } });

    // Delete sample from R2 (best-effort)
    if (voice.sampleUrl) {
      try {
        const key = voice.sampleUrl.split("/").slice(-3).join("/");
        await deleteFile(key);
      } catch {
        // Ignore R2 cleanup errors
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { errorKey: "voice.deleteFailed" },
      { status: 500 }
    );
  }
}
