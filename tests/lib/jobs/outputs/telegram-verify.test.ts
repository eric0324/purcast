import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateVerificationCode,
  verifyCode,
  storeVerifiedChatId,
  getVerifiedChatId,
  cleanupExpiredCodes,
} from "@/lib/jobs/outputs/telegram-verify";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("generateVerificationCode", () => {
  it("returns a 6-digit string", () => {
    const code = generateVerificationCode("user-1");
    expect(code).toMatch(/^\d{6}$/);
  });

  it("removes previous code for the same user", () => {
    const code1 = generateVerificationCode("user-1");
    const code2 = generateVerificationCode("user-1");

    expect(code1).not.toBe(code2);
    // Old code should no longer work
    expect(verifyCode(code1)).toBeNull();
    // New code should work
    const result = verifyCode(code2);
    expect(result).toEqual({ userId: "user-1" });
  });

  it("allows different users to have codes simultaneously", () => {
    const code1 = generateVerificationCode("user-1");
    const code2 = generateVerificationCode("user-2");

    const result1 = verifyCode(code1);
    const result2 = verifyCode(code2);

    expect(result1).toEqual({ userId: "user-1" });
    expect(result2).toEqual({ userId: "user-2" });
  });
});

describe("verifyCode", () => {
  it("returns userId for a valid code", () => {
    const code = generateVerificationCode("user-1");
    const result = verifyCode(code);
    expect(result).toEqual({ userId: "user-1" });
  });

  it("returns null for a non-existent code", () => {
    expect(verifyCode("000000")).toBeNull();
  });

  it("consumes the code (cannot verify twice)", () => {
    const code = generateVerificationCode("user-1");
    verifyCode(code);
    expect(verifyCode(code)).toBeNull();
  });

  it("returns null for an expired code", () => {
    const code = generateVerificationCode("user-1");

    // Fast-forward time past TTL
    vi.useFakeTimers();
    vi.advanceTimersByTime(11 * 60 * 1000); // 11 minutes

    expect(verifyCode(code)).toBeNull();

    vi.useRealTimers();
  });
});

describe("storeVerifiedChatId / getVerifiedChatId", () => {
  it("stores and retrieves chatId", () => {
    storeVerifiedChatId("user-1", "chat-123");
    expect(getVerifiedChatId("user-1")).toBe("chat-123");
  });

  it("consumes the result (cannot retrieve twice)", () => {
    storeVerifiedChatId("user-1", "chat-123");
    getVerifiedChatId("user-1");
    expect(getVerifiedChatId("user-1")).toBeNull();
  });

  it("returns null for unknown user", () => {
    expect(getVerifiedChatId("unknown")).toBeNull();
  });

  it("returns null for expired result", () => {
    storeVerifiedChatId("user-1", "chat-123");

    vi.useFakeTimers();
    vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes (TTL is 5)

    expect(getVerifiedChatId("user-1")).toBeNull();

    vi.useRealTimers();
  });
});

describe("cleanupExpiredCodes", () => {
  it("removes expired codes and results", () => {
    // Generate a code — it will expire after 10 min
    generateVerificationCode("user-1");
    storeVerifiedChatId("user-2", "chat-456");

    vi.useFakeTimers();
    vi.advanceTimersByTime(11 * 60 * 1000);

    cleanupExpiredCodes();

    // Both should be cleaned up
    expect(getVerifiedChatId("user-2")).toBeNull();

    vi.useRealTimers();
  });
});
