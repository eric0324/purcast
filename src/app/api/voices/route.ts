import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { uploadFile, deleteFile } from "@/lib/r2/utils";
import { createTTSProvider } from "@/lib/tts/provider";
import { checkFeatureAccess } from "@/lib/billing/feature-gate";
import { randomUUID } from "node:crypto";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/m4a"];

export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const name = formData.get("name") as string | null;
    const file = formData.get("file") as Blob | null;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { errorKey: "voice.nameRequired" },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof Blob) || file.size === 0) {
      return NextResponse.json(
        { errorKey: "voice.fileRequired" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { errorKey: "voice.fileTooLarge" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { errorKey: "voice.unsupportedFormat" },
        { status: 400 }
      );
    }

    // Upload sample to R2
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.type === "audio/mpeg" ? "mp3" : file.type.includes("wav") ? "wav" : "m4a";
    const r2Key = `voices/${user.id}/${randomUUID()}.${ext}`;

    const sampleUrl = await uploadFile(r2Key, buffer, file.type);

    // Clone voice with ElevenLabs
    let elevenlabsVoiceId: string;
    try {
      const tts = createTTSProvider();
      elevenlabsVoiceId = await tts.cloneVoice(buffer, name.trim());
    } catch {
      // Clean up R2 on clone failure
      try {
        await deleteFile(r2Key);
      } catch {
        // Ignore cleanup error
      }
      return NextResponse.json(
        { errorKey: "voice.cloneFailed" },
        { status: 500 }
      );
    }

    // Save to database
    const voice = await prisma.voice.create({
      data: {
        userId: user.id,
        elevenlabsVoiceId,
        name: name.trim(),
        sampleUrl,
      },
    });

    return NextResponse.json({ voice });
  } catch {
    return NextResponse.json(
      { errorKey: "voice.cloneFailed" },
      { status: 500 }
    );
  }
}
