import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.stubEnv("LINE_TOKEN_ENCRYPTION_KEY", "my-super-secret-encryption-key-123");
});

import { encryptToken, decryptToken } from "@/lib/jobs/outputs/line-token";

describe("LINE token encryption", () => {
  it("encrypts and decrypts a token correctly", () => {
    const originalToken = "line-channel-access-token-abc123";

    const encrypted = encryptToken(originalToken);
    const decrypted = decryptToken(encrypted);

    expect(decrypted).toBe(originalToken);
  });

  it("produces different ciphertext for same input (due to random IV)", () => {
    const token = "same-token";

    const encrypted1 = encryptToken(token);
    const encrypted2 = encryptToken(token);

    expect(encrypted1).not.toBe(encrypted2);
    // But both decrypt to the same value
    expect(decryptToken(encrypted1)).toBe(token);
    expect(decryptToken(encrypted2)).toBe(token);
  });

  it("returns string in iv:tag:data format", () => {
    const encrypted = encryptToken("test");
    const parts = encrypted.split(":");

    expect(parts).toHaveLength(3);
    // IV should be 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // GCM tag should be 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
  });

  it("throws on invalid encrypted format", () => {
    expect(() => decryptToken("invalid-data")).toThrow("Invalid encrypted token format");
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encryptToken("test-token");
    // Tamper with the encrypted data
    const parts = encrypted.split(":");
    parts[2] = "00".repeat(parts[2].length / 2);
    const tampered = parts.join(":");

    expect(() => decryptToken(tampered)).toThrow();
  });

  it("throws when encryption key is not set", () => {
    vi.stubEnv("LINE_TOKEN_ENCRYPTION_KEY", "");

    // Need to re-import to get fresh module... actually the function reads env at call time
    // So just clear the env
    delete process.env.LINE_TOKEN_ENCRYPTION_KEY;

    expect(() => encryptToken("test")).toThrow("LINE_TOKEN_ENCRYPTION_KEY");
  });
});
