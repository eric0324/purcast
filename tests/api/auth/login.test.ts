import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockFindUnique, mockSetAuthCookie, mockComparePassword } =
  vi.hoisted(() => ({
    mockFindUnique: vi.fn(),
    mockSetAuthCookie: vi.fn(),
    mockComparePassword: vi.fn(),
  }));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("@/lib/auth/cookie", () => ({
  setAuthCookie: mockSetAuthCookie,
}));

vi.mock("@/lib/auth/password", () => ({
  comparePassword: mockComparePassword,
}));

import { POST } from "@/app/api/auth/login/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSetAuthCookie.mockResolvedValue(undefined);
});

describe("POST /api/auth/login", () => {
  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({ password: "12345678" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("auth.emailPasswordRequired");
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeRequest({ email: "test@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("auth.emailPasswordRequired");
  });

  it("returns 401 when user does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ email: "noone@example.com", password: "12345678" })
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.errorKey).toBe("auth.invalidCredentials");
  });

  it("returns 401 when user has no passwordHash (Google-only account)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "google@example.com",
      passwordHash: null,
    });

    const res = await POST(
      makeRequest({ email: "google@example.com", password: "12345678" })
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.errorKey).toBe("auth.invalidCredentials");
  });

  it("returns 401 when password is incorrect", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      passwordHash: "hashed",
    });
    mockComparePassword.mockResolvedValue(false);

    const res = await POST(
      makeRequest({ email: "test@example.com", password: "wrongpass" })
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.errorKey).toBe("auth.invalidCredentials");
  });

  it("returns 200 with user on successful login", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      name: "Test",
      passwordHash: "hashed",
    });
    mockComparePassword.mockResolvedValue(true);

    const res = await POST(
      makeRequest({ email: "test@example.com", password: "correct" })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user).toEqual({
      id: "user-1",
      email: "test@example.com",
      name: "Test",
    });
    expect(mockSetAuthCookie).toHaveBeenCalledWith("user-1", "test@example.com");
  });
});
