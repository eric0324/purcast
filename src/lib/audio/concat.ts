import { execFile } from "node:child_process";
import {
  writeFileSync,
  readFileSync,
  existsSync,
  unlinkSync,
  mkdirSync,
  rmdirSync,
} from "node:fs";
import { randomUUID } from "node:crypto";

const SILENCE_DURATION_S = 0.6;
const FADE_IN_DURATION_S = 0.8;
const FADE_OUT_DURATION_S = 1.5;

export async function concatAudioSegments(
  segments: Buffer[]
): Promise<Buffer> {
  const sessionId = randomUUID();
  const tmpDir = `/tmp/purcast-${sessionId}`;
  mkdirSync(tmpDir, { recursive: true });

  const segmentPaths: string[] = [];
  const silencePath = `${tmpDir}/silence.mp3`;
  const rawOutputPath = `${tmpDir}/raw-output.mp3`;
  const outputPath = `${tmpDir}/output.mp3`;
  const concatListPath = `${tmpDir}/concat.txt`;
  const allTmpPaths = [silencePath, rawOutputPath, outputPath, concatListPath];

  try {
    // Write segments to temp files
    for (let i = 0; i < segments.length; i++) {
      const path = `${tmpDir}/seg-${i}.mp3`;
      writeFileSync(path, segments[i]);
      segmentPaths.push(path);
      allTmpPaths.push(path);
    }

    // Generate silence file
    await execAsync("ffmpeg", [
      "-f", "lavfi",
      "-i", `anullsrc=r=44100:cl=stereo`,
      "-t", String(SILENCE_DURATION_S),
      "-codec:a", "libmp3lame",
      "-b:a", "128k",
      "-y", silencePath,
    ]);

    // Build concat list
    const lines: string[] = [];
    for (let i = 0; i < segmentPaths.length; i++) {
      lines.push(`file '${segmentPaths[i]}'`);
      if (i < segmentPaths.length - 1) {
        lines.push(`file '${silencePath}'`);
      }
    }
    writeFileSync(concatListPath, lines.join("\n"));

    // Concat with ffmpeg
    await execAsync("ffmpeg", [
      "-f", "concat",
      "-safe", "0",
      "-i", concatListPath,
      "-codec:a", "libmp3lame",
      "-b:a", "128k",
      "-y", rawOutputPath,
    ]);

    // Get total duration via ffprobe
    const duration = await getDuration(rawOutputPath);
    const fadeOutStart = Math.max(0, duration - FADE_OUT_DURATION_S);

    // Apply fade-in and fade-out
    await execAsync("ffmpeg", [
      "-i", rawOutputPath,
      "-af", `afade=t=in:d=${FADE_IN_DURATION_S},afade=t=out:st=${fadeOutStart}:d=${FADE_OUT_DURATION_S}`,
      "-codec:a", "libmp3lame",
      "-b:a", "128k",
      "-y", outputPath,
    ]);

    return readFileSync(outputPath);
  } finally {
    for (const path of allTmpPaths) {
      try {
        if (existsSync(path)) unlinkSync(path);
      } catch {
        // Ignore cleanup errors
      }
    }
    try {
      rmdirSync(tmpDir);
    } catch {
      // Ignore
    }
  }
}

function execAsync(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function getDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    execFile(
      "ffprobe",
      [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      (error, stdout) => {
        if (error) reject(error);
        else resolve(parseFloat(stdout.trim()));
      }
    );
  });
}
