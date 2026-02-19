import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendAudio = vi.fn();
const mockSendMessage = vi.fn();

vi.mock("grammy", () => {
  function MockBot() {
    return {
      api: {
        sendAudio: mockSendAudio,
        sendMessage: mockSendMessage,
      },
    };
  }
  function MockInputFile(input: unknown) {
    return { input };
  }
  return { Bot: MockBot, InputFile: MockInputFile };
});

import { TelegramChannel } from "@/lib/jobs/outputs/telegram";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TelegramChannel", () => {
  const channel = new TelegramChannel("test-bot-token");
  const chatId = "12345";

  describe("sendAudio", () => {
    it("sends audio with title and caption", async () => {
      mockSendAudio.mockResolvedValue({});

      await channel.sendAudio(chatId, "https://r2.example.com/audio.mp3", "My Podcast");

      expect(mockSendAudio).toHaveBeenCalledWith(
        chatId,
        expect.anything(),
        { title: "My Podcast", caption: "My Podcast" }
      );
    });

    it("throws on API failure", async () => {
      mockSendAudio.mockRejectedValue(new Error("Chat not found"));

      await expect(
        channel.sendAudio(chatId, "https://r2.example.com/audio.mp3", "Title")
      ).rejects.toThrow("Chat not found");
    });
  });

  describe("sendLink", () => {
    it("sends formatted message with MarkdownV2", async () => {
      mockSendMessage.mockResolvedValue({});

      await channel.sendLink(chatId, "My Podcast", "A summary", "https://purcast.com/p/123");

      expect(mockSendMessage).toHaveBeenCalledWith(
        chatId,
        expect.stringContaining("My Podcast"),
        { parse_mode: "MarkdownV2" }
      );
    });

    it("throws on API failure", async () => {
      mockSendMessage.mockRejectedValue(new Error("Bot blocked"));

      await expect(
        channel.sendLink(chatId, "Title", "Summary", "https://purcast.com/p/1")
      ).rejects.toThrow("Bot blocked");
    });
  });

  describe("sendBoth", () => {
    it("sends link message first, then audio", async () => {
      mockSendMessage.mockResolvedValue({});
      mockSendAudio.mockResolvedValue({});

      await channel.sendBoth(
        chatId,
        "My Podcast",
        "A summary",
        "https://purcast.com/p/123",
        "https://r2.example.com/audio.mp3"
      );

      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      expect(mockSendAudio).toHaveBeenCalledTimes(1);

      // Verify link was sent first
      const sendMessageOrder = mockSendMessage.mock.invocationCallOrder[0];
      const sendAudioOrder = mockSendAudio.mock.invocationCallOrder[0];
      expect(sendMessageOrder).toBeLessThan(sendAudioOrder);
    });

    it("fails if link send fails (audio not sent)", async () => {
      mockSendMessage.mockRejectedValue(new Error("Network error"));

      await expect(
        channel.sendBoth(chatId, "Title", "Summary", "https://url", "https://audio")
      ).rejects.toThrow("Network error");

      expect(mockSendAudio).not.toHaveBeenCalled();
    });
  });
});
