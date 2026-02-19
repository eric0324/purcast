import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserFindUnique,
  mockUsageFindUnique,
  mockUsageUpsert,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUsageFindUnique: vi.fn(),
  mockUsageUpsert: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
    },
    usage: {
      findUnique: mockUsageFindUnique,
      upsert: mockUsageUpsert,
    },
  },
}));

import { checkUsageLimit, incrementUsage } from "@/lib/billing/usage";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkUsageLimit", () => {
  it("returns allowed: true for free user under limit", async () => {
    mockUserFindUnique.mockResolvedValue({ plan: "free" });
    mockUsageFindUnique.mockResolvedValue({ generationCount: 3 });

    const result = await checkUsageLimit("user-1");

    expect(result).toEqual({
      allowed: true,
      used: 3,
      limit: 5,
      plan: "free",
    });
  });

  it("returns allowed: false for free user at limit", async () => {
    mockUserFindUnique.mockResolvedValue({ plan: "free" });
    mockUsageFindUnique.mockResolvedValue({ generationCount: 5 });

    const result = await checkUsageLimit("user-1");

    expect(result).toEqual({
      allowed: false,
      used: 5,
      limit: 5,
      plan: "free",
    });
  });

  it("returns allowed: true for pro user under limit", async () => {
    mockUserFindUnique.mockResolvedValue({ plan: "pro" });
    mockUsageFindUnique.mockResolvedValue({ generationCount: 50 });

    const result = await checkUsageLimit("user-1");

    expect(result).toEqual({
      allowed: true,
      used: 50,
      limit: 100,
      plan: "pro",
    });
  });

  it("returns used: 0 when no usage record exists", async () => {
    mockUserFindUnique.mockResolvedValue({ plan: "free" });
    mockUsageFindUnique.mockResolvedValue(null);

    const result = await checkUsageLimit("user-1");

    expect(result).toEqual({
      allowed: true,
      used: 0,
      limit: 5,
      plan: "free",
    });
  });

  it("throws error when user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    await expect(checkUsageLimit("invalid-user")).rejects.toThrow(
      "User not found"
    );
  });

  it("queries usage with current month in YYYY-MM format", async () => {
    mockUserFindUnique.mockResolvedValue({ plan: "free" });
    mockUsageFindUnique.mockResolvedValue({ generationCount: 2 });

    await checkUsageLimit("user-1");

    const currentMonth = new Date().toISOString().slice(0, 7);
    expect(mockUsageFindUnique).toHaveBeenCalledWith({
      where: {
        userId_month: {
          userId: "user-1",
          month: currentMonth,
        },
      },
      select: { generationCount: true },
    });
  });
});

describe("incrementUsage", () => {
  it("calls upsert with correct month format", async () => {
    await incrementUsage("user-1");

    const currentMonth = new Date().toISOString().slice(0, 7);
    expect(mockUsageUpsert).toHaveBeenCalledWith({
      where: {
        userId_month: {
          userId: "user-1",
          month: currentMonth,
        },
      },
      update: {
        generationCount: {
          increment: 1,
        },
      },
      create: {
        userId: "user-1",
        month: currentMonth,
        generationCount: 1,
      },
    });
  });

  it("increments existing usage record", async () => {
    mockUsageUpsert.mockResolvedValue({
      id: "usage-1",
      userId: "user-1",
      month: "2026-02",
      generationCount: 4,
    });

    await incrementUsage("user-1");

    expect(mockUsageUpsert).toHaveBeenCalled();
  });
});
