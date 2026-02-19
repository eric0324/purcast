import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetCurrentUser,
  mockFindUnique,
  mockUpdate,
  mockCheckUsageLimit,
  mockCalculateNextRunAt,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockCheckUsageLimit: vi.fn(),
  mockCalculateNextRunAt: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    job: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

vi.mock("@/lib/billing/usage", () => ({
  checkUsageLimit: mockCheckUsageLimit,
}));

vi.mock("@/lib/jobs/schedule", () => ({
  calculateNextRunAt: mockCalculateNextRunAt,
}));

import { PATCH } from "@/app/api/jobs/[id]/status/route";

const mockUser = { id: "user-1", email: "test@test.com" };
const mockJob = {
  id: "job-1",
  userId: "user-1",
  status: "paused",
  schedule: { mode: "daily", time: "08:00", timezone: "Asia/Taipei" },
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/jobs/job-1/status", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCalculateNextRunAt.mockReturnValue(new Date("2026-02-20T00:00:00Z"));
});

describe("PATCH /api/jobs/[id]/status", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ status: "active" }), makeParams("job-1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid status", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindUnique.mockResolvedValue(mockJob);

    const res = await PATCH(makeRequest({ status: "deleted" }), makeParams("job-1"));
    expect(res.status).toBe(400);
  });

  it("activates a job with quota check", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindUnique.mockResolvedValue(mockJob);
    mockCheckUsageLimit.mockResolvedValue({ allowed: true, used: 1, limit: 5, plan: "free" });
    mockUpdate.mockResolvedValue({ ...mockJob, status: "active" });

    const res = await PATCH(makeRequest({ status: "active" }), makeParams("job-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.job.status).toBe("active");
    expect(mockCheckUsageLimit).toHaveBeenCalledWith("user-1");
  });

  it("rejects activation when quota exhausted", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindUnique.mockResolvedValue(mockJob);
    mockCheckUsageLimit.mockResolvedValue({ allowed: false, used: 5, limit: 5, plan: "free" });

    const res = await PATCH(makeRequest({ status: "active" }), makeParams("job-1"));
    expect(res.status).toBe(403);
  });

  it("pauses a job without quota check", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindUnique.mockResolvedValue({ ...mockJob, status: "active" });
    mockUpdate.mockResolvedValue({ ...mockJob, status: "paused" });

    const res = await PATCH(makeRequest({ status: "paused" }), makeParams("job-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.job.status).toBe("paused");
    expect(mockCheckUsageLimit).not.toHaveBeenCalled();
  });
});
