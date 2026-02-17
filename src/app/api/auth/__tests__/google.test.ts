import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockFindFirst, mockCreate, mockUpdate, mockSetAuthCookie, mockVerifyIdToken } =
  vi.hoisted(() => ({
    mockFindFirst: vi.fn(),
    mockCreate: vi.fn(),
    mockUpdate: vi.fn(),
    mockSetAuthCookie: vi.fn(),
    mockVerifyIdToken: vi.fn(),
  }));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    user: {
      findFirst: mockFindFirst,
      create: mockCreate,
      update: mockUpdate,
    },
  },
}));

vi.mock("@/lib/auth/cookie", () => ({
  setAuthCookie: mockSetAuthCookie,
}));

vi.mock("google-auth-library", () => {
  const MockOAuth2Client = function () {
    // @ts-expect-error mock constructor
    this.verifyIdToken = mockVerifyIdToken;
  };
  return { OAuth2Client: MockOAuth2Client };
});

import { POST } from "../google/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/google", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSetAuthCookie.mockResolvedValue(undefined);
});

describe("POST /api/auth/google", () => {
  it("returns 400 when idToken is missing", async () => {
    const res = await POST(makeRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("auth.missingGoogleToken");
  });

  it("returns 401 when Google verification fails (no payload)", async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => null });

    const res = await POST(makeRequest({ idToken: "bad-token" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.errorKey).toBe("auth.googleVerifyFailed");
  });

  it("returns 401 when Google payload has no email", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: "google-123", name: "Test" }),
    });

    const res = await POST(makeRequest({ idToken: "no-email-token" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.errorKey).toBe("auth.googleVerifyFailed");
  });

  it("creates a new user when no existing account found", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-123",
        email: "new@gmail.com",
        name: "New Google User",
      }),
    });
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "new-user-id",
      email: "new@gmail.com",
      name: "New Google User",
    });

    const res = await POST(makeRequest({ idToken: "valid-token" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user).toEqual({
      id: "new-user-id",
      email: "new@gmail.com",
      name: "New Google User",
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: { email: "new@gmail.com", googleId: "google-123", name: "New Google User" },
    });
    expect(mockSetAuthCookie).toHaveBeenCalledWith("new-user-id", "new@gmail.com");
  });

  it("logs in existing user who already has googleId linked", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-123",
        email: "existing@gmail.com",
        name: "Existing",
      }),
    });
    mockFindFirst.mockResolvedValue({
      id: "existing-id",
      email: "existing@gmail.com",
      name: "Existing",
      googleId: "google-123",
    });

    const res = await POST(makeRequest({ idToken: "valid-token" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user.id).toBe("existing-id");
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("links Google account to existing user without googleId", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-456",
        email: "link@gmail.com",
        name: "Google Name",
      }),
    });
    mockFindFirst.mockResolvedValue({
      id: "link-id",
      email: "link@gmail.com",
      name: "Original Name",
      googleId: null,
    });
    mockUpdate.mockResolvedValue({
      id: "link-id",
      email: "link@gmail.com",
      name: "Original Name",
      googleId: "google-456",
    });

    const res = await POST(makeRequest({ idToken: "valid-token" }));
    await res.json();

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "link-id" },
      data: { googleId: "google-456", name: "Original Name" },
    });
  });
});
