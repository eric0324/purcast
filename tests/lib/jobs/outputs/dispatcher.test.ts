import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockTelegramSendAudio,
  mockTelegramSendLink,
  mockTelegramSendBoth,
} = vi.hoisted(() => ({
  mockTelegramSendAudio: vi.fn(),
  mockTelegramSendLink: vi.fn(),
  mockTelegramSendBoth: vi.fn(),
}));

vi.mock("@/lib/jobs/outputs/telegram", () => {
  function MockTelegramChannel() {
    return {
      sendAudio: mockTelegramSendAudio,
      sendLink: mockTelegramSendLink,
      sendBoth: mockTelegramSendBoth,
    };
  }
  return { TelegramChannel: MockTelegramChannel };
});

import { publishToChannels, type PodcastInfo } from "@/lib/jobs/outputs/index";
import type { JobOutputConfig } from "@/lib/jobs/types";

const podcast: PodcastInfo = {
  title: "Test Podcast",
  summary: "A test summary",
  playbackUrl: "https://purcast.com/p/1",
  audioUrl: "https://r2.example.com/audio.mp3",
  durationMs: 120000,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("publishToChannels", () => {
  it("sends audio to Telegram", async () => {
    const configs: JobOutputConfig[] = [
      { type: "telegram", chatId: "123", format: "audio" },
    ];

    const results = await publishToChannels(configs, podcast);

    expect(results).toEqual([{ type: "telegram", success: true }]);
    expect(mockTelegramSendAudio).toHaveBeenCalledWith(
      "123",
      podcast.audioUrl,
      podcast.title
    );
  });

  it("sends link to Telegram", async () => {
    const configs: JobOutputConfig[] = [
      { type: "telegram", chatId: "123", format: "link" },
    ];

    const results = await publishToChannels(configs, podcast);

    expect(results).toEqual([{ type: "telegram", success: true }]);
    expect(mockTelegramSendLink).toHaveBeenCalledWith(
      "123",
      podcast.title,
      podcast.summary,
      podcast.playbackUrl
    );
  });

  it("sends both to Telegram", async () => {
    const configs: JobOutputConfig[] = [
      { type: "telegram", chatId: "123", format: "both" },
    ];

    const results = await publishToChannels(configs, podcast);

    expect(results).toEqual([{ type: "telegram", success: true }]);
    expect(mockTelegramSendBoth).toHaveBeenCalled();
  });

  it("handles multiple Telegram channels", async () => {
    const configs: JobOutputConfig[] = [
      { type: "telegram", chatId: "123", format: "audio" },
      { type: "telegram", chatId: "456", format: "link" },
    ];

    const results = await publishToChannels(configs, podcast);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ type: "telegram", success: true });
    expect(results[1]).toEqual({ type: "telegram", success: true });
  });

  it("continues with other channels when one fails", async () => {
    mockTelegramSendAudio.mockRejectedValueOnce(new Error("Bot blocked"));

    const configs: JobOutputConfig[] = [
      { type: "telegram", chatId: "123", format: "audio" },
      { type: "telegram", chatId: "456", format: "link" },
    ];

    const results = await publishToChannels(configs, podcast);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      type: "telegram",
      success: false,
      error: "Bot blocked",
    });
    expect(results[1]).toEqual({ type: "telegram", success: true });
  });
});
