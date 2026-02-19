import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetCurrentUser,
  mockFindUnique,
  mockUpdate,
  mockDelete,
  mockCalculateNextRunAt,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
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
      delete: mockDelete,
    },
  },
}));

vi.mock("@/lib/jobs/schedule", () => ({
  calculateNextRunAt: mockCalculateNextRunAt,
}));

import { GET, PUT, DELETE } from "@/app/api/jobs/[id]/route";

const mockUser = { id: "user-1", email: "test@test.com" };
const mockJob = {
  id: "job-1",
  userId: "user-1",
  name: "Test Job",
  status: "paused",
  runs: [],
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/jobs/job-1", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCalculateNextRunAt.mockReturnValue(new Date("2026-02-20T00:00:00Z"));
});

describe("GET /api/jobs/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/jobs/job-1");
    const res = await GET(req, makeParams("job-1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when job not found", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/jobs/job-1");
    const res = await GET(req, makeParams("job-1"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when job belongs to another user", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindUnique.mockResolvedValue({ ...mockJob, userId: "other-user" });

    const req = new NextRequest("http://localhost/api/jobs/job-1");
    const res = await GET(req, makeParams("job-1"));
    expect(res.status).toBe(404);
  });

  it("returns job detail with runs", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindUnique.mockResolvedValue(mockJob);

    const req = new NextRequest("http://localhost/api/jobs/job-1");
    const res = await GET(req, makeParams("job-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.job.id).toBe("job-1");
  });
});

describe("PUT /api/jobs/[id]", () => {
  it("updates job name", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindUnique.mockResolvedValue(mockJob);
    mockUpdate.mockResolvedValue({ ...mockJob, name: "Updated Name" });

    const res = await PUT(makeRequest({ name: "Updated Name" }), makeParams("job-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.job.name).toBe("Updated Name");
  });

  it("recalculates nextRunAt when schedule changes", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindUnique.mockResolvedValue(mockJob);
    mockUpdate.mockResolvedValue(mockJob);

    const newSchedule = { mode: "daily", time: "10:00", timezone: "Asia/Taipei" };
    await PUT(makeRequest({ schedule: newSchedule }), makeParams("job-1"));

    expect(mockCalculateNextRunAt).toHaveBeenCalledWith(newSchedule);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nextRunAt: expect.any(Date) }),
      })
    );
  });

  it("returns 404 for non-existent job", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindUnique.mockResolvedValue(null);

    const res = await PUT(makeRequest({ name: "X" }), makeParams("job-99"));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/jobs/[id]", () => {
  it("deletes job", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindUnique.mockResolvedValue(mockJob);
    mockDelete.mockResolvedValue(mockJob);

    const req = new NextRequest("http://localhost/api/jobs/job-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("job-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.deleted).toBe(true);
  });

  it("returns 404 for non-existent job", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/jobs/job-99", { method: "DELETE" });
    const res = await DELETE(req, makeParams("job-99"));
    expect(res.status).toBe(404);
  });
});
