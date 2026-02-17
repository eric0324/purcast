import pLimit from "p-limit";
import type { DialogueScript } from "@/lib/llm/types";
import type { TTSProvider } from "./types";

const CONCURRENCY = 3;
const MAX_RETRIES = 2;

export async function synthesizeScript(
  provider: TTSProvider,
  script: DialogueScript,
  voiceAId: string,
  voiceBId: string
): Promise<Buffer[]> {
  const limit = pLimit(CONCURRENCY);
  const results: Buffer[] = new Array(script.length);

  const tasks = script.map((line, index) =>
    limit(async () => {
      const voiceId = line.speaker === "A" ? voiceAId : voiceBId;
      let lastError: unknown;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          results[index] = await provider.synthesize(line.text, voiceId);
          return;
        } catch (error) {
          lastError = error;
          if (attempt < MAX_RETRIES) {
            await sleep(100 * Math.pow(2, attempt));
          }
        }
      }

      throw lastError;
    })
  );

  await Promise.all(tasks);
  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
