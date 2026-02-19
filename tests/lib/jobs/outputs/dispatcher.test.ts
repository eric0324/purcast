import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockTelegramSendAudio,
  mockTelegramSendLink,
  mockTelegramSendBoth,
  mockLineSendAudio,
  mockLineSendLink,
  mockLineSendBoth,
  mockDecryptToken,
} = vi.hoisted(() => ({
  mockTelegramSendAudio: vi.fn(),
  mockTelegramSendLink: vi.fn(),
  mockTelegramSendBoth: vi.fn(),
  mockLineSendAudio: vi.fn(),
  mockLineSendLink: vi.fn(),
  mockLineSendBoth: vi.fn(),
  mockDecryptToken: vi.fn(),
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

vi.mock("@/lib/jobs/outputs/line", () => {
  function MockLineChannel() {
    return {
      sendAudio: mockLineSendAudio,
      sendLink: mockLineSendLink,
      sendBoth: mockLineSendBoth,
    };
  }
  return { LineChannel: MockLineChannel };
});

vi.mock("@/lib/jobs/outputs/line-token", () => ({
  decryptToken: mockDecryptToken,
}));

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
  mockDecryptToken.mockReturnValue("decrypted-token");
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

  it("sends link to LINE with decrypted token", async () => {
    const configs: JobOutputConfig[] = [
      {
        type: "line",
        channelAccessToken: "encrypted-token",
        lineUserIds: ["user-1"],
        format: "link",
      },
    ];

    const results = await publishToChannels(configs, podcast);

    expect(results).toEqual([{ type: "line", success: true }]);
    expect(mockDecryptToken).toHaveBeenCalledWith("encrypted-token");
    expect(mockLineSendLink).toHaveBeenCalledWith(
      ["user-1"],
      podcast.title,
      podcast.summary,
      podcast.playbackUrl
    );
  });

  it("sends audio to LINE", async () => {
    const configs: JobOutputConfig[] = [
      {
        type: "line",
        channelAccessToken: "token",
        lineUserIds: ["user-1"],
        format: "audio",
      },
    ];

    const results = await publishToChannels(configs, podcast);

    expect(results).toEqual([{ type: "line", success: true }]);
    expect(mockLineSendAudio).toHaveBeenCalledWith(
      ["user-1"],
      podcast.audioUrl,
      podcast.durationMs,
      podcast.title
    );
  });

  it("sends both to LINE", async () => {
    const configs: JobOutputConfig[] = [
      {
        type: "line",
        channelAccessToken: "token",
        lineUserIds: ["user-1"],
        format: "both",
      },
    ];

    const results = await publishToChannels(configs, podcast);

    expect(results).toEqual([{ type: "line", success: true }]);
    expect(mockLineSendBoth).toHaveBeenCalled();
  });

  it("fails LINE if no users to send to", async () => {
    const configs: JobOutputConfig[] = [
      {
        type: "line",
        channelAccessToken: "token",
        lineUserIds: [],
        format: "link",
      },
    ];

    const results = await publishToChannels(configs, podcast);

    expect(results).toEqual([
      { type: "line", success: false, error: "No LINE users to send to" },
    ]);
    expect(mockLineSendLink).not.toHaveBeenCalled();
  });

  it("handles multiple output channels", async () => {
    const configs: JobOutputConfig[] = [
      { type: "telegram", chatId: "123", format: "audio" },
      {
        type: "line",
        channelAccessToken: "token",
        lineUserIds: ["user-1"],
        format: "link",
      },
    ];

    const results = await publishToChannels(configs, podcast);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ type: "telegram", success: true });
    expect(results[1]).toEqual({ type: "line", success: true });
  });

  it("continues with other channels when one fails", async () => {
    mockTelegramSendAudio.mockRejectedValue(new Error("Bot blocked"));

    const configs: JobOutputConfig[] = [
      { type: "telegram", chatId: "123", format: "audio" },
      {
        type: "line",
        channelAccessToken: "token",
        lineUserIds: ["user-1"],
        format: "link",
      },
    ];

    const results = await publishToChannels(configs, podcast);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      type: "telegram",
      success: false,
      error: "Bot blocked",
    });
    expect(results[1]).toEqual({ type: "line", success: true });
  });

  it("falls back to plain token if decryption fails", async () => {
    mockDecryptToken.mockImplementation(() => {
      throw new Error("Decryption failed");
    });

    const configs: JobOutputConfig[] = [
      {
        type: "line",
        channelAccessToken: "plain-token",
        lineUserIds: ["user-1"],
        format: "link",
      },
    ];

    const results = await publishToChannels(configs, podcast);

    expect(results).toEqual([{ type: "line", success: true }]);
  });
});
