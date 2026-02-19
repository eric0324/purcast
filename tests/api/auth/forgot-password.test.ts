import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockUserFindUnique,
  mockTokenCreate,
  mockSendPasswordResetEmail,
  mockGenerateResetToken,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockTokenCreate: vi.fn(),
  mockSendPasswordResetEmail: vi.fn(),
  mockGenerateResetToken: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    passwordResetToken: { create: mockTokenCreate },
  },
}));

vi.mock("@/lib/auth/jwt", () => ({
  generateResetToken: mockGenerateResetToken,
}));

vi.mock("@/lib/email/client", () => ({
  sendPasswordResetEmail: mockSendPasswordResetEmail,
}));

import { POST } from "@/app/api/auth/forgot-password/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerateResetToken.mockReturnValue("mock-reset-token");
  mockTokenCreate.mockResolvedValue({});
  mockSendPasswordResetEmail.mockResolvedValue(undefined);
});

describe("POST /api/auth/forgot-password", () => {
  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("auth.emailRequired");
  });

  it("returns 200 even when user does not exist (prevents enumeration)", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ email: "noone@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("ok");
    expect(mockTokenCreate).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("creates a reset token and sends email when user exists", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user@example.com" });

    const res = await POST(makeRequest({ email: "user@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("ok");
    expect(mockTokenCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        token: "mock-reset-token",
        expiresAt: expect.any(Date),
      },
    });
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      "user@example.com",
      "mock-reset-token"
    );
  });
});
