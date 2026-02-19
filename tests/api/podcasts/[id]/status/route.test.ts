import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetCurrentUser, mockPodcastFindUnique } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockPodcastFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    podcast: {
      findUnique: mockPodcastFindUnique,
    },
  },
}));

import { GET } from "@/app/api/podcasts/[id]/status/route";

function makeRequest() {
  return new NextRequest("http://localhost/api/podcasts/p1/status");
}

const params = Promise.resolve({ id: "p1" });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/podcasts/[id]/status", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const res = await GET(makeRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.errorKey).toBe("unauthorized");
  });

  it("returns 404 when podcast does not exist", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue(null);

    const res = await GET(makeRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.errorKey).toBe("script.podcastNotFound");
  });

  it("returns 404 when podcast belongs to another user", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      userId: "user-2",
      status: "pending",
      errorMessage: null,
    });

    const res = await GET(makeRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.errorKey).toBe("script.podcastNotFound");
  });

  it("returns status and errorMessage on success", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      userId: "user-1",
      status: "generating_script",
      errorMessage: null,
    });

    const res = await GET(makeRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      status: "generating_script",
      errorMessage: null,
    });
  });

  it("returns error message when failed", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      userId: "user-1",
      status: "failed",
      errorMessage: "Something went wrong",
    });

    const res = await GET(makeRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      status: "failed",
      errorMessage: "Something went wrong",
    });
  });
});
