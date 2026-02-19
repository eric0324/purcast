import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockGenerateVerificationCode = vi.hoisted(() => vi.fn());
const mockGetVerifiedChatId = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/jobs/outputs/telegram-verify", () => ({
  generateVerificationCode: mockGenerateVerificationCode,
  getVerifiedChatId: mockGetVerifiedChatId,
}));

import { POST, GET } from "@/app/api/telegram/connect/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TELEGRAM_BOT_USERNAME", "TestPurCastBot");
});

describe("POST /api/telegram/connect", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("generates and returns a verification code", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1", email: "test@test.com" });
    mockGenerateVerificationCode.mockReturnValue("654321");

    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe("654321");
    expect(data.botLink).toBe("https://t.me/TestPurCastBot");
    expect(data.expiresInSeconds).toBe(600);
    expect(mockGenerateVerificationCode).toHaveBeenCalledWith("user-1");
  });
});

describe("GET /api/telegram/connect", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns verified: false when no result yet", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1", email: "test@test.com" });
    mockGetVerifiedChatId.mockReturnValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.verified).toBe(false);
    expect(data.chatId).toBeUndefined();
  });

  it("returns chatId when verification is complete", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1", email: "test@test.com" });
    mockGetVerifiedChatId.mockReturnValue("chat-12345");

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.verified).toBe(true);
    expect(data.chatId).toBe("chat-12345");
  });
});
