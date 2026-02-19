import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so the mock fns are available when vi.mock factory runs
const { mockSet, mockDelete } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: mockSet,
    delete: mockDelete,
  }),
}));

vi.mock("@/lib/auth/jwt", () => ({
  signJWT: vi.fn().mockReturnValue("mock-jwt-token"),
}));

import { setAuthCookie, clearAuthCookie, COOKIE_NAME } from "@/lib/auth/cookie";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setAuthCookie", () => {
  it("sets an httpOnly cookie with the correct options", async () => {
    await setAuthCookie("user-1", "test@example.com");

    expect(mockSet).toHaveBeenCalledWith("purcast_token", "mock-jwt-token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  });
});

describe("clearAuthCookie", () => {
  it("deletes the auth cookie", async () => {
    await clearAuthCookie();
    expect(mockDelete).toHaveBeenCalledWith("purcast_token");
  });
});

describe("COOKIE_NAME", () => {
  it("equals 'purcast_token'", () => {
    expect(COOKIE_NAME).toBe("purcast_token");
  });
});
