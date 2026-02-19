import { describe, it, expect, vi, beforeEach } from "vitest";
import { LineChannel, LineApiError, verifyLineSignature } from "@/lib/jobs/outputs/line";

const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LineChannel", () => {
  const channel = new LineChannel("test-access-token");
  const userIds = ["user-1", "user-2"];

  describe("sendLink", () => {
    it("sends a text message with title, summary, and link", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await channel.sendLink(userIds, "My Podcast", "A summary", "https://purcast.com/p/1");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.line.me/v2/bot/message/multicast",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-access-token",
          }),
        })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.to).toEqual(userIds);
      expect(body.messages[0].type).toBe("text");
      expect(body.messages[0].text).toContain("My Podcast");
      expect(body.messages[0].text).toContain("A summary");
      expect(body.messages[0].text).toContain("https://purcast.com/p/1");
    });

    it("throws LineApiError on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Invalid token"),
      });

      await expect(
        channel.sendLink(userIds, "Title", "Summary", "https://url")
      ).rejects.toThrow(LineApiError);
    });

    it("includes status code in LineApiError", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve("Rate limited"),
      });

      try {
        await channel.sendLink(userIds, "Title", "Summary", "https://url");
      } catch (error) {
        expect(error).toBeInstanceOf(LineApiError);
        expect((error as LineApiError).statusCode).toBe(429);
      }
    });
  });

  describe("sendAudio", () => {
    it("sends audio message and title text", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await channel.sendAudio(
        userIds,
        "https://r2.example.com/audio.mp3",
        120000,
        "My Podcast"
      );

      // Should be called twice: once for audio, once for title text
      expect(mockFetch).toHaveBeenCalledTimes(2);

      const audioBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(audioBody.messages[0].type).toBe("audio");
      expect(audioBody.messages[0].originalContentUrl).toBe("https://r2.example.com/audio.mp3");
      expect(audioBody.messages[0].duration).toBe(120000);

      const textBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(textBody.messages[0].type).toBe("text");
      expect(textBody.messages[0].text).toContain("My Podcast");
    });
  });

  describe("sendBoth", () => {
    it("sends link message then audio", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await channel.sendBoth(
        userIds,
        "My Podcast",
        "A summary",
        "https://purcast.com/p/1",
        "https://r2.example.com/audio.mp3",
        120000
      );

      // sendLink (1 call) + pushMessage for audio (1 call) = 2 calls
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // First call should be the link message
      const linkBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(linkBody.messages[0].text).toContain("A summary");

      // Second call should be the audio
      const audioBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(audioBody.messages[0].type).toBe("audio");
    });
  });
});

describe("verifyLineSignature", () => {
  const channelSecret = "test-secret";

  it("returns true for valid signature", () => {
    const body = '{"events":[]}';
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("SHA256", channelSecret)
      .update(body)
      .digest("base64");

    expect(verifyLineSignature(body, expectedSignature, channelSecret)).toBe(true);
  });

  it("returns false for invalid signature", () => {
    expect(verifyLineSignature('{"events":[]}', "invalid-sig", channelSecret)).toBe(false);
  });

  it("returns false for tampered body", () => {
    const body = '{"events":[]}';
    const crypto = require("crypto");
    const signature = crypto
      .createHmac("SHA256", channelSecret)
      .update(body)
      .digest("base64");

    expect(verifyLineSignature('{"events":["tampered"]}', signature, channelSecret)).toBe(false);
  });
});
