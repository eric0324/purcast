import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockClearAuthCookie } = vi.hoisted(() => ({
  mockClearAuthCookie: vi.fn(),
}));

vi.mock("@/lib/auth/cookie", () => ({
  clearAuthCookie: mockClearAuthCookie,
}));

import { POST } from "@/app/api/auth/logout/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockClearAuthCookie.mockResolvedValue(undefined);
});

describe("POST /api/auth/logout", () => {
  it("clears the auth cookie and returns success", async () => {
    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockClearAuthCookie).toHaveBeenCalledOnce();
  });
});
