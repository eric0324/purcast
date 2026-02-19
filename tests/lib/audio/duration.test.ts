import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFfprobe = vi.fn();

vi.mock("fluent-ffmpeg", () => ({
  default: {
    ffprobe: (...args: unknown[]) => mockFfprobe(...args),
  },
}));

import { getAudioDuration } from "@/lib/audio/duration";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAudioDuration", () => {
  it("returns duration in seconds", async () => {
    mockFfprobe.mockImplementation(
      (_path: string, cb: (err: null, data: { format: { duration: number } }) => void) => {
        cb(null, { format: { duration: 125.4 } });
      }
    );

    const duration = await getAudioDuration("/tmp/test.mp3");
    expect(duration).toBe(125);
  });

  it("returns 0 for invalid audio", async () => {
    mockFfprobe.mockImplementation(
      (_path: string, cb: (err: Error) => void) => {
        cb(new Error("Invalid audio"));
      }
    );

    const duration = await getAudioDuration("/tmp/invalid.mp3");
    expect(duration).toBe(0);
  });

  it("returns 0 when duration is undefined", async () => {
    mockFfprobe.mockImplementation(
      (_path: string, cb: (err: null, data: { format: Record<string, never> }) => void) => {
        cb(null, { format: {} });
      }
    );

    const duration = await getAudioDuration("/tmp/test.mp3");
    expect(duration).toBe(0);
  });
});
