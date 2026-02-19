import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockFindUnique, mockCreate, mockSetAuthCookie, mockHashPassword } =
  vi.hoisted(() => ({
    mockFindUnique: vi.fn(),
    mockCreate: vi.fn(),
    mockSetAuthCookie: vi.fn(),
    mockHashPassword: vi.fn(),
  }));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}));

vi.mock("@/lib/auth/cookie", () => ({
  setAuthCookie: mockSetAuthCookie,
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: mockHashPassword,
}));

import { POST } from "@/app/api/auth/register/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHashPassword.mockResolvedValue("hashed-password");
  mockSetAuthCookie.mockResolvedValue(undefined);
});

describe("POST /api/auth/register", () => {
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

  it("returns 400 for invalid email format", async () => {
    const res = await POST(makeRequest({ email: "not-an-email", password: "12345678" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("auth.invalidEmail");
  });

  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await POST(
      makeRequest({ email: "test@example.com", password: "short" })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("auth.passwordTooShort");
  });

  it("returns 409 when email already exists", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing-user" });

    const res = await POST(
      makeRequest({ email: "taken@example.com", password: "12345678" })
    );
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.errorKey).toBe("auth.emailTaken");
  });

  it("returns 200 with user on successful registration", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "new-user-id",
      email: "new@example.com",
      name: "New User",
    });

    const res = await POST(
      makeRequest({
        email: "new@example.com",
        password: "12345678",
        name: "New User",
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user).toEqual({
      id: "new-user-id",
      email: "new@example.com",
      name: "New User",
    });
    expect(mockHashPassword).toHaveBeenCalledWith("12345678");
    expect(mockCreate).toHaveBeenCalledWith({
      data: { email: "new@example.com", passwordHash: "hashed-password", name: "New User" },
    });
    expect(mockSetAuthCookie).toHaveBeenCalledWith("new-user-id", "new@example.com");
  });
});
