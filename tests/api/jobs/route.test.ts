import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetCurrentUser,
  mockFindMany,
  mockCreate,
  mockCalculateNextRunAt,
  mockChannelFindMany,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
  mockCalculateNextRunAt: vi.fn(),
  mockChannelFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    job: {
      findMany: mockFindMany,
      create: mockCreate,
    },
    channel: {
      findMany: mockChannelFindMany,
    },
  },
}));

vi.mock("@/lib/jobs/schedule", () => ({
  calculateNextRunAt: mockCalculateNextRunAt,
}));

import { GET, POST } from "@/app/api/jobs/route";

const mockUser = { id: "user-1", email: "test@test.com" };

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/jobs", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validJobBody = {
  name: "Tech Digest",
  sources: [{ type: "rss", url: "https://example.com/feed" }],
  schedule: { mode: "daily", time: "08:00", timezone: "Asia/Taipei" },
  generationConfig: {
    stylePreset: "news_brief",
    voiceId: "voice-1",
    maxArticles: 5,
    targetMinutes: 15,
  },
  outputConfig: [{ channelId: "ch-1", format: "audio" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCalculateNextRunAt.mockReturnValue(new Date("2026-02-20T00:00:00Z"));
});

describe("GET /api/jobs", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns user's jobs", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindMany.mockResolvedValue([
      { id: "job-1", name: "Test Job", status: "active", runs: [] },
    ]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.jobs).toHaveLength(1);
    expect(data.jobs[0].name).toBe("Test Job");
  });
});

describe("POST /api/jobs", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(makeRequest(validJobBody));
    expect(res.status).toBe(401);
  });

  it("creates a job successfully", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockChannelFindMany.mockResolvedValue([{ id: "ch-1" }]);
    mockCreate.mockResolvedValue({ id: "job-1", ...validJobBody });

    const res = await POST(makeRequest(validJobBody));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.job.id).toBe("job-1");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          name: "Tech Digest",
          status: "paused",
        }),
      })
    );
  });

  it("returns 400 when name is missing", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    const { name, ...rest } = validJobBody;
    const res = await POST(makeRequest(rest));
    expect(res.status).toBe(400);
  });

  it("returns 400 when sources is empty array", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    const res = await POST(makeRequest({ ...validJobBody, sources: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid source URL", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    const res = await POST(
      makeRequest({
        ...validJobBody,
        sources: [{ type: "rss", url: "not-a-url" }],
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid source type", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    const res = await POST(
      makeRequest({
        ...validJobBody,
        sources: [{ type: "twitter", url: "https://x.com/user" }],
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid schedule mode", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    const res = await POST(
      makeRequest({
        ...validJobBody,
        schedule: { mode: "hourly", time: "08:00", timezone: "UTC" },
      })
    );
    expect(res.status).toBe(400);
  });
});
