import type { TTSProvider } from "./types";
import { TTSError } from "./types";

const BASE_URL = "https://api.elevenlabs.io/v1";
const MODEL_ID = "eleven_flash_v2_5";
const OUTPUT_FORMAT = "mp3_44100_128";

export class ElevenLabsProvider implements TTSProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY!;
  }

  async synthesize(text: string, voiceId: string): Promise<Buffer> {
    const res = await fetch(
      `${BASE_URL}/text-to-speech/${voiceId}?output_format=${OUTPUT_FORMAT}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
        }),
      }
    );

    if (!res.ok) {
      if (res.status === 429) {
        throw new TTSError("RATE_LIMIT", "Rate limit exceeded");
      }
      const body = await res.text();
      throw new TTSError("SYNTHESIS_FAILED", `TTS synthesis failed: ${body}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async cloneVoice(audioFile: Buffer, name: string): Promise<string> {
    const formData = new FormData();
    formData.append("name", name);
    formData.append(
      "files",
      new Blob([new Uint8Array(audioFile)], { type: "audio/mpeg" }),
      "sample.mp3"
    );

    const res = await fetch(`${BASE_URL}/voices/add`, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
      },
      body: formData,
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new TTSError("RATE_LIMIT", "Rate limit exceeded");
      }
      const body = await res.text();
      throw new TTSError("CLONE_FAILED", `Voice cloning failed: ${body}`);
    }

    const data = await res.json();
    return data.voice_id;
  }

  async deleteVoice(voiceId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/voices/${voiceId}`, {
      method: "DELETE",
      headers: {
        "xi-api-key": this.apiKey,
      },
    });

    if (!res.ok && res.status !== 404) {
      const body = await res.text();
      throw new TTSError("API_ERROR", `Failed to delete voice: ${body}`);
    }
  }
}
