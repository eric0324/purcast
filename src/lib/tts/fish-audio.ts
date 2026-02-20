import type { TTSProvider } from "./types";
import { TTSError } from "./types";

const BASE_URL = "https://api.fish.audio";

export class FishAudioProvider implements TTSProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.FISH_AUDIO_API_KEY!;
  }

  async synthesize(text: string, voiceId: string): Promise<Buffer> {
    const res = await fetch(`${BASE_URL}/v1/tts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        reference_id: voiceId,
        format: "mp3",
        mp3_bitrate: 128,
        latency: "normal",
        speed: 0.9,
      }),
    });

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
    formData.append("title", name);
    formData.append("type", "tts");
    formData.append("train_mode", "fast");
    formData.append("visibility", "private");
    formData.append(
      "voices",
      new Blob([new Uint8Array(audioFile)], { type: "audio/mpeg" }),
      "sample.mp3"
    );

    const res = await fetch(`${BASE_URL}/model`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
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
    return data._id;
  }

  async deleteVoice(voiceId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/model/${voiceId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!res.ok && res.status !== 404) {
      const body = await res.text();
      throw new TTSError("API_ERROR", `Failed to delete voice: ${body}`);
    }
  }
}
