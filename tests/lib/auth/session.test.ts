import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGet, mockDelete, mockVerifyJWT, mockFindUnique } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockDelete: vi.fn(),
  mockVerifyJWT: vi.fn(),
  mockFindUnique: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: mockGet,
    delete: mockDelete,
  }),
}));

vi.mock("@/lib/auth/jwt", () => ({
  verifyJWT: mockVerifyJWT,
}));

vi.mock("@/lib/auth/cookie", () => ({
  COOKIE_NAME: "purcast_token",
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));

import { getCurrentUser } from "@/lib/auth/session";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentUser", () => {
  it("returns null when no cookie exists", async () => {
    mockGet.mockReturnValue(undefined);

    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it("returns null when token is invalid", async () => {
    mockGet.mockReturnValue({ value: "invalid-token" });
    mockVerifyJWT.mockReturnValue(null);

    const user = await getCurrentUser();
    expect(user).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns null and clears cookie when user does not exist in DB", async () => {
    mockGet.mockReturnValue({ value: "valid-token" });
    mockVerifyJWT.mockReturnValue({ userId: "user-1", email: "test@example.com" });
    mockFindUnique.mockResolvedValue(null);

    const user = await getCurrentUser();
    expect(user).toBeNull();
    expect(mockDelete).toHaveBeenCalledWith("purcast_token");
  });

  it("returns the user when token is valid and user exists", async () => {
    const mockUser = {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed",
      googleId: null,
      plan: "free",
      newebpayCustomerId: null,
      subscriptionEndDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockGet.mockReturnValue({ value: "valid-token" });
    mockVerifyJWT.mockReturnValue({ userId: "user-1", email: "test@example.com" });
    mockFindUnique.mockResolvedValue(mockUser);

    const user = await getCurrentUser();
    expect(user).toEqual(mockUser);
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });
});
