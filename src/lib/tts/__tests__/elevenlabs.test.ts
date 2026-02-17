import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { ElevenLabsProvider } from "../elevenlabs";
import { TTSError } from "../types";

const ELEVENLABS_API_KEY = "test-api-key";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ELEVENLABS_API_KEY = ELEVENLABS_API_KEY;
});

describe("ElevenLabsProvider", () => {
  describe("synthesize", () => {
    it("calls correct endpoint with voice ID", async () => {
      const audioBuffer = Buffer.from("fake-audio");
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(audioBuffer.buffer),
      });

      const provider = new ElevenLabsProvider();
      await provider.synthesize("Hello world", "voice-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.elevenlabs.io/v1/text-to-speech/voice-123?output_format=mp3_44100_128",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("sends correct request body with model_id", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });

      const provider = new ElevenLabsProvider();
      await provider.synthesize("Hello world", "voice-123");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({
        text: "Hello world",
        model_id: "eleven_flash_v2_5",
      });
    });

    it("returns audio Buffer on success", async () => {
      const audioData = new Uint8Array([1, 2, 3, 4]);
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(audioData.buffer),
      });

      const provider = new ElevenLabsProvider();
      const result = await provider.synthesize("Hello", "voice-123");

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("throws SYNTHESIS_FAILED on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      const provider = new ElevenLabsProvider();
      const error = await provider
        .synthesize("Hello", "voice-123")
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TTSError);
      expect((error as TTSError).code).toBe("SYNTHESIS_FAILED");
    });

    it("throws RATE_LIMIT on 429 response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve("Rate limited"),
      });

      const provider = new ElevenLabsProvider();
      const error = await provider
        .synthesize("Hello", "voice-123")
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TTSError);
      expect((error as TTSError).code).toBe("RATE_LIMIT");
    });
  });

  describe("cloneVoice", () => {
    it("calls correct endpoint with multipart form data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ voice_id: "cloned-voice-id" }),
      });

      const audioFile = Buffer.from("fake-audio-file");
      const provider = new ElevenLabsProvider();
      await provider.cloneVoice(audioFile, "My Voice");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.elevenlabs.io/v1/voices/add",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "xi-api-key": ELEVENLABS_API_KEY,
          }),
        })
      );
    });

    it("returns voice_id on success", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ voice_id: "cloned-voice-id" }),
      });

      const audioFile = Buffer.from("fake-audio-file");
      const provider = new ElevenLabsProvider();
      const voiceId = await provider.cloneVoice(audioFile, "My Voice");

      expect(voiceId).toBe("cloned-voice-id");
    });

    it("sends FormData with name and file", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ voice_id: "cloned-voice-id" }),
      });

      const audioFile = Buffer.from("fake-audio-file");
      const provider = new ElevenLabsProvider();
      await provider.cloneVoice(audioFile, "My Voice");

      const body = mockFetch.mock.calls[0][1].body;
      expect(body).toBeInstanceOf(FormData);
    });

    it("throws CLONE_FAILED on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad request"),
      });

      const audioFile = Buffer.from("fake-audio-file");
      const provider = new ElevenLabsProvider();
      const error = await provider
        .cloneVoice(audioFile, "My Voice")
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TTSError);
      expect((error as TTSError).code).toBe("CLONE_FAILED");
    });

    it("throws RATE_LIMIT on 429 response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve("Rate limited"),
      });

      const audioFile = Buffer.from("fake-audio-file");
      const provider = new ElevenLabsProvider();
      const error = await provider
        .cloneVoice(audioFile, "My Voice")
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TTSError);
      expect((error as TTSError).code).toBe("RATE_LIMIT");
    });
  });

  describe("deleteVoice", () => {
    it("calls correct endpoint", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const provider = new ElevenLabsProvider();
      await provider.deleteVoice("voice-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.elevenlabs.io/v1/voices/voice-123",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({
            "xi-api-key": ELEVENLABS_API_KEY,
          }),
        })
      );
    });

    it("does not throw on 404", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
      });

      const provider = new ElevenLabsProvider();
      await expect(provider.deleteVoice("voice-123")).resolves.toBeUndefined();
    });

    it("throws API_ERROR on other failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Server error"),
      });

      const provider = new ElevenLabsProvider();
      const error = await provider
        .deleteVoice("voice-123")
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TTSError);
      expect((error as TTSError).code).toBe("API_ERROR");
    });
  });
});
