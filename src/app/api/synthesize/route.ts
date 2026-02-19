import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { createTTSProvider } from "@/lib/tts/provider";
import { synthesizeScript } from "@/lib/tts/synthesize-script";
import { concatAudioSegments } from "@/lib/audio/concat";
import { getAudioDuration } from "@/lib/audio/duration";
import { uploadFile } from "@/lib/r2/utils";
import type { DialogueScript } from "@/lib/llm/types";
import { writeFileSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { errorKey: "unauthorized" },
        { status: 401 }
      );
    }

    const { podcastId, voiceAId: requestVoiceAId, voiceBId: requestVoiceBId } = await request.json();

    if (!podcastId) {
      return NextResponse.json(
        { errorKey: "synthesize.podcastIdRequired" },
        { status: 400 }
      );
    }

    const podcast = await prisma.podcast.findUnique({
      where: { id: podcastId },
    });

    if (!podcast || podcast.userId !== user.id) {
      return NextResponse.json(
        { errorKey: "synthesize.podcastNotFound" },
        { status: 404 }
      );
    }

    if (podcast.status === "completed" && podcast.audioUrl) {
      return NextResponse.json({ audioUrl: podcast.audioUrl });
    }

    if (podcast.status !== "script_ready" && podcast.status !== "failed") {
      return NextResponse.json(
        { errorKey: "synthesize.invalidStatus" },
        { status: 409 }
      );
    }

    if (!podcast.script) {
      return NextResponse.json(
        { errorKey: "synthesize.invalidStatus" },
        { status: 409 }
      );
    }

    // Set status to generating_audio
    await prisma.podcast.update({
      where: { id: podcastId },
      data: { status: "generating_audio" },
    });

    // Fire-and-forget background synthesis
    const script = podcast.script as unknown as DialogueScript;
    const userId = user.id;

    processAudioSynthesis(podcastId, script, userId, requestVoiceAId, requestVoiceBId).catch(() => {
      // Error handling inside processAudioSynthesis
    });

    return NextResponse.json(
      { status: "generating_audio" },
      { status: 202 }
    );
  } catch {
    return NextResponse.json(
      { errorKey: "synthesize.failed" },
      { status: 500 }
    );
  }
}

async function processAudioSynthesis(
  podcastId: string,
  script: DialogueScript,
  userId: string,
  requestVoiceAId?: string,
  requestVoiceBId?: string
) {
  try {
    // Use explicitly selected voices, or fall back to defaults
    const defaultVoiceA =
      process.env.FISH_AUDIO_DEFAULT_VOICE_A || process.env.ELEVENLABS_DEFAULT_VOICE_A!;
    const defaultVoiceB =
      process.env.FISH_AUDIO_DEFAULT_VOICE_B || process.env.ELEVENLABS_DEFAULT_VOICE_B!;

    const voiceAId = requestVoiceAId || defaultVoiceA;
    const voiceBId = requestVoiceBId || defaultVoiceB;

    // Synthesize all segments
    const tts = createTTSProvider();
    const segments = await synthesizeScript(tts, script, voiceAId, voiceBId);

    // Concatenate segments with silence
    const finalAudio = await concatAudioSegments(segments);

    // Get duration via temp file
    const tmpPath = `/tmp/purcast-dur-${randomUUID()}.mp3`;
    writeFileSync(tmpPath, finalAudio);
    let duration: number;
    try {
      duration = await getAudioDuration(tmpPath);
    } finally {
      try {
        unlinkSync(tmpPath);
      } catch {
        // Ignore
      }
    }

    // Upload to R2
    const r2Key = `podcasts/${userId}/${podcastId}.mp3`;
    const audioUrl = await uploadFile(r2Key, finalAudio, "audio/mpeg");

    // Update podcast
    await prisma.podcast.update({
      where: { id: podcastId },
      data: {
        status: "completed",
        audioUrl,
        duration,
      },
    });
  } catch (error) {
    await prisma.podcast.update({
      where: { id: podcastId },
      data: {
        status: "failed",
        errorMessage:
          error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}
