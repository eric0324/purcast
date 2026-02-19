import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetCurrentUser, mockCheckUsageLimit } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockCheckUsageLimit: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/billing/usage", () => ({
  checkUsageLimit: mockCheckUsageLimit,
}));

import { GET } from "@/app/api/usage/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/usage", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.errorKey).toBe("unauthorized");
  });

  it("returns usage data on success", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockCheckUsageLimit.mockResolvedValue({
      allowed: true,
      used: 3,
      limit: 5,
      plan: "free",
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      used: 3,
      limit: 5,
      plan: "free",
    });
    expect(mockCheckUsageLimit).toHaveBeenCalledWith("user-1");
  });

  it("returns pro user usage data", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-2" });
    mockCheckUsageLimit.mockResolvedValue({
      allowed: true,
      used: 50,
      limit: 9999,
      plan: "pro",
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      used: 50,
      limit: 9999,
      plan: "pro",
    });
  });

  it("returns 500 on error", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockCheckUsageLimit.mockRejectedValue(new Error("Database error"));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.errorKey).toBe("usage.fetchFailed");
  });
});
