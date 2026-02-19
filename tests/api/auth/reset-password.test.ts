import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockTokenFindUnique, mockTransaction, mockHashPassword, mockUserUpdate, mockTokenUpdate } = vi.hoisted(
  () => ({
    mockTokenFindUnique: vi.fn(),
    mockTransaction: vi.fn(),
    mockHashPassword: vi.fn(),
    mockUserUpdate: vi.fn(),
    mockTokenUpdate: vi.fn(),
  })
);

vi.mock("@/lib/db/client", () => ({
  prisma: {
    passwordResetToken: { findUnique: mockTokenFindUnique, update: mockTokenUpdate },
    user: { update: mockUserUpdate },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: mockHashPassword,
}));

import { POST } from "@/app/api/auth/reset-password/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHashPassword.mockResolvedValue("new-hashed-password");
  // prisma.$transaction([...]) receives PrismaPromise array
  // The individual update calls return PrismaPromise-like objects passed into $transaction
  mockUserUpdate.mockReturnValue(Promise.resolve({}));
  mockTokenUpdate.mockReturnValue(Promise.resolve({}));
  mockTransaction.mockResolvedValue([{}, {}]);
});

describe("POST /api/auth/reset-password", () => {
  it("returns 400 when token is missing", async () => {
    const res = await POST(makeRequest({ password: "newpass123" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("auth.tokenPasswordRequired");
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeRequest({ token: "some-token" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("auth.tokenPasswordRequired");
  });

  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await POST(makeRequest({ token: "some-token", password: "short" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("auth.passwordTooShort");
  });

  it("returns 400 when token does not exist", async () => {
    mockTokenFindUnique.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ token: "nonexistent", password: "newpass123" })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("auth.resetLinkInvalid");
  });

  it("returns 400 when token has already been used", async () => {
    mockTokenFindUnique.mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      token: "used-token",
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const res = await POST(
      makeRequest({ token: "used-token", password: "newpass123" })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("auth.resetLinkInvalid");
  });

  it("returns 400 when token has expired", async () => {
    mockTokenFindUnique.mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      token: "expired-token",
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
    });

    const res = await POST(
      makeRequest({ token: "expired-token", password: "newpass123" })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("auth.resetLinkInvalid");
  });

  it("returns 200 and resets password on valid token", async () => {
    mockTokenFindUnique.mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      token: "valid-token",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const res = await POST(
      makeRequest({ token: "valid-token", password: "newpass123" })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("ok");
    expect(mockHashPassword).toHaveBeenCalledWith("newpass123");
    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Array));
  });
});
