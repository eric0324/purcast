import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetCurrentUser,
  mockPodcastCreate,
  mockCheckUsageLimit,
  mockIncrementUsage,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockPodcastCreate: vi.fn(),
  mockCheckUsageLimit: vi.fn(),
  mockIncrementUsage: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    podcast: {
      create: mockPodcastCreate,
    },
  },
}));

vi.mock("@/lib/billing/usage", () => ({
  checkUsageLimit: mockCheckUsageLimit,
  incrementUsage: mockIncrementUsage,
}));

import { POST } from "@/app/api/podcasts/create/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/podcasts/create", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validBody = {
  sourceType: "text",
  sourceContent: "a".repeat(200),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/podcasts/create", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.errorKey).toBe("unauthorized");
  });

  it("returns 400 when sourceType is invalid", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });

    const res = await POST(
      makeRequest({
        sourceType: "invalid",
        sourceContent: "a".repeat(200),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("podcast.invalidSourceType");
  });

  it("returns 400 when sourceContent is missing", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });

    const res = await POST(
      makeRequest({ sourceType: "text" })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("podcast.contentRequired");
  });

  it("returns 400 when content is too short after cleaning", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });

    const res = await POST(
      makeRequest({
        sourceType: "text",
        sourceContent: "short",
      })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("podcast.contentTooShort");
  });

  it("returns 403 when user exceeds usage limit", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockCheckUsageLimit.mockResolvedValue({
      allowed: false,
      used: 5,
      limit: 5,
      plan: "free",
    });

    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.errorKey).toBe("usage.limitReached");
    expect(mockPodcastCreate).not.toHaveBeenCalled();
  });

  it("returns 200 with podcast id on success (text source)", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockCheckUsageLimit.mockResolvedValue({
      allowed: true,
      used: 2,
      limit: 5,
      plan: "free",
    });
    mockPodcastCreate.mockResolvedValue({ id: "podcast-1" });

    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.podcast).toEqual({ id: "podcast-1" });
    expect(mockPodcastCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        sourceType: "text",
        status: "pending",
      }),
    });
    expect(mockIncrementUsage).toHaveBeenCalledWith("user-1");
  });

  it("returns 200 with podcast id on success (url source)", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockCheckUsageLimit.mockResolvedValue({
      allowed: true,
      used: 1,
      limit: 5,
      plan: "free",
    });
    mockPodcastCreate.mockResolvedValue({ id: "podcast-2" });

    const res = await POST(
      makeRequest({
        sourceType: "url",
        sourceContent: "a".repeat(200),
        sourceUrl: "https://example.com/article",
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.podcast).toEqual({ id: "podcast-2" });
    expect(mockPodcastCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceType: "url",
        sourceUrl: "https://example.com/article",
      }),
    });
    expect(mockIncrementUsage).toHaveBeenCalledWith("user-1");
  });

  it("cleans HTML from sourceContent before saving", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockCheckUsageLimit.mockResolvedValue({
      allowed: true,
      used: 0,
      limit: 5,
      plan: "free",
    });
    mockPodcastCreate.mockResolvedValue({ id: "podcast-3" });

    const htmlContent = "<p>" + "a".repeat(200) + "</p>";
    const res = await POST(
      makeRequest({
        sourceType: "text",
        sourceContent: htmlContent,
      })
    );

    expect(res.status).toBe(200);
    // Verify cleaned content was saved (no HTML tags)
    const savedData = mockPodcastCreate.mock.calls[0][0].data;
    expect(savedData.sourceContent).not.toContain("<p>");
    expect(savedData.sourceContent).not.toContain("</p>");
  });

  it("returns 500 on unexpected error", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastCreate.mockRejectedValue(new Error("db error"));

    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.errorKey).toBe("podcast.createFailed");
  });
});
