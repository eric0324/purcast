import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserFindUnique } = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
  },
}));

import { checkFeatureAccess } from "@/lib/billing/feature-gate";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkFeatureAccess", () => {
  it("returns false for free user accessing voice-clone", async () => {
    mockUserFindUnique.mockResolvedValue({ plan: "free" });

    const result = await checkFeatureAccess("user-1", "voice-clone");

    expect(result).toBe(false);
  });

  it("returns true for pro user accessing voice-clone", async () => {
    mockUserFindUnique.mockResolvedValue({ plan: "pro" });

    const result = await checkFeatureAccess("user-1", "voice-clone");

    expect(result).toBe(true);
  });

  it("throws if user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    await expect(
      checkFeatureAccess("nonexistent", "voice-clone")
    ).rejects.toThrow("User not found");
  });
});
