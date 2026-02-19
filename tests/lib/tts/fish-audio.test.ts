import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { FishAudioProvider } from "@/lib/tts/fish-audio";
import { TTSError } from "@/lib/tts/types";

const FISH_AUDIO_API_KEY = "test-api-key";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.FISH_AUDIO_API_KEY = FISH_AUDIO_API_KEY;
});

describe("FishAudioProvider", () => {
  describe("synthesize", () => {
    it("calls correct endpoint with reference_id", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });

      const provider = new FishAudioProvider();
      await provider.synthesize("Hello world", "model-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.fish.audio/v1/tts",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Bearer ${FISH_AUDIO_API_KEY}`,
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("sends correct request body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });

      const provider = new FishAudioProvider();
      await provider.synthesize("Hello world", "model-123");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({
        text: "Hello world",
        reference_id: "model-123",
        format: "mp3",
        mp3_bitrate: 128,
        latency: "normal",
      });
    });

    it("returns audio Buffer on success", async () => {
      const audioData = new Uint8Array([1, 2, 3, 4]);
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(audioData.buffer),
      });

      const provider = new FishAudioProvider();
      const result = await provider.synthesize("Hello", "model-123");

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("throws SYNTHESIS_FAILED on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      const provider = new FishAudioProvider();
      const error = await provider
        .synthesize("Hello", "model-123")
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

      const provider = new FishAudioProvider();
      const error = await provider
        .synthesize("Hello", "model-123")
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TTSError);
      expect((error as TTSError).code).toBe("RATE_LIMIT");
    });
  });

  describe("cloneVoice", () => {
    it("calls correct endpoint with multipart form data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ _id: "new-model-id" }),
      });

      const audioFile = Buffer.from("fake-audio-file");
      const provider = new FishAudioProvider();
      await provider.cloneVoice(audioFile, "My Voice");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.fish.audio/model",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Bearer ${FISH_AUDIO_API_KEY}`,
          }),
        })
      );
    });

    it("returns model _id on success", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ _id: "new-model-id" }),
      });

      const audioFile = Buffer.from("fake-audio-file");
      const provider = new FishAudioProvider();
      const modelId = await provider.cloneVoice(audioFile, "My Voice");

      expect(modelId).toBe("new-model-id");
    });

    it("sends FormData with title, type, train_mode, and voices", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ _id: "new-model-id" }),
      });

      const audioFile = Buffer.from("fake-audio-file");
      const provider = new FishAudioProvider();
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
      const provider = new FishAudioProvider();
      const error = await provider
        .cloneVoice(audioFile, "My Voice")
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TTSError);
      expect((error as TTSError).code).toBe("CLONE_FAILED");
    });
  });

  describe("deleteVoice", () => {
    it("calls correct endpoint", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const provider = new FishAudioProvider();
      await provider.deleteVoice("model-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.fish.audio/model/model-123",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({
            Authorization: `Bearer ${FISH_AUDIO_API_KEY}`,
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

      const provider = new FishAudioProvider();
      await expect(provider.deleteVoice("model-123")).resolves.toBeUndefined();
    });

    it("throws API_ERROR on other failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Server error"),
      });

      const provider = new FishAudioProvider();
      const error = await provider
        .deleteVoice("model-123")
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TTSError);
      expect((error as TTSError).code).toBe("API_ERROR");
    });
  });
});
