import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyCode = vi.hoisted(() => vi.fn());
const mockStoreVerifiedChatId = vi.hoisted(() => vi.fn());

vi.mock("@/lib/jobs/outputs/telegram-verify", () => ({
  verifyCode: mockVerifyCode,
  storeVerifiedChatId: mockStoreVerifiedChatId,
}));

// Mock global fetch for Telegram API calls
const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/telegram/webhook/route";

function makeUpdate(text: string, chatId = 12345) {
  return new NextRequest("http://localhost/api/telegram/webhook", {
    method: "POST",
    body: JSON.stringify({
      message: {
        text,
        chat: { id: chatId },
      },
    }),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true });
  // Set env for tests
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "");
});

describe("POST /api/telegram/webhook", () => {
  it("returns 403 when secret header does not match", async () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "my-secret");

    const req = new NextRequest("http://localhost/api/telegram/webhook", {
      method: "POST",
      body: JSON.stringify({ message: { text: "hi", chat: { id: 1 } } }),
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": "wrong-secret",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 200 for updates without text messages", async () => {
    const req = new NextRequest("http://localhost/api/telegram/webhook", {
      method: "POST",
      body: JSON.stringify({ update_id: 123 }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("verifies a valid 6-digit code and stores chatId", async () => {
    mockVerifyCode.mockReturnValue({ userId: "user-1" });

    const res = await POST(makeUpdate("123456"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockVerifyCode).toHaveBeenCalledWith("123456");
    expect(mockStoreVerifiedChatId).toHaveBeenCalledWith("user-1", "12345");

    // Should send success message
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("sendMessage"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("綁定成功"),
      })
    );
  });

  it("sends error message for invalid/expired code", async () => {
    mockVerifyCode.mockReturnValue(null);

    const res = await POST(makeUpdate("999999"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockStoreVerifiedChatId).not.toHaveBeenCalled();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("sendMessage"),
      expect.objectContaining({
        body: expect.stringContaining("無效或已過期"),
      })
    );
  });

  it("sends help message for non-code text", async () => {
    const res = await POST(makeUpdate("hello"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("sendMessage"),
      expect.objectContaining({
        body: expect.stringContaining("歡迎使用 PurCast Bot"),
      })
    );
  });

  it("trims whitespace from code before verification", async () => {
    mockVerifyCode.mockReturnValue({ userId: "user-1" });

    await POST(makeUpdate("  123456  "));

    expect(mockVerifyCode).toHaveBeenCalledWith("123456");
  });

  it("converts chatId to string", async () => {
    mockVerifyCode.mockReturnValue({ userId: "user-1" });

    await POST(makeUpdate("123456", 99999));

    expect(mockStoreVerifiedChatId).toHaveBeenCalledWith("user-1", "99999");
  });

  it("returns 200 even on internal errors", async () => {
    mockVerifyCode.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    const res = await POST(makeUpdate("123456"));
    expect(res.status).toBe(200);
  });
});
