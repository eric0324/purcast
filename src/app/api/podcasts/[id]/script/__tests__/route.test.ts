import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetCurrentUser, mockPodcastFindUnique, mockPodcastUpdate } =
  vi.hoisted(() => ({
    mockGetCurrentUser: vi.fn(),
    mockPodcastFindUnique: vi.fn(),
    mockPodcastUpdate: vi.fn(),
  }));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    podcast: {
      findUnique: mockPodcastFindUnique,
      update: mockPodcastUpdate,
    },
  },
}));

import { PUT } from "../route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/podcasts/p1/script", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const params = Promise.resolve({ id: "p1" });

const validScript = [
  { speaker: "A", text: "Hello" },
  { speaker: "B", text: "Hi there" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PUT /api/podcasts/[id]/script", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const res = await PUT(makeRequest({ script: validScript }), { params });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.errorKey).toBe("unauthorized");
  });

  it("returns 404 when podcast does not exist", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue(null);

    const res = await PUT(makeRequest({ script: validScript }), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.errorKey).toBe("script.podcastNotFound");
  });

  it("returns 404 when podcast belongs to another user", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-2",
    });

    const res = await PUT(makeRequest({ script: validScript }), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.errorKey).toBe("script.podcastNotFound");
  });

  it("returns 400 when script is not an array", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
    });

    const res = await PUT(makeRequest({ script: "not array" }), { params });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("script.invalidScript");
  });

  it("returns 400 when script is empty array", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
    });

    const res = await PUT(makeRequest({ script: [] }), { params });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("script.invalidScript");
  });

  it("returns 400 when speaker is invalid", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
    });

    const res = await PUT(
      makeRequest({ script: [{ speaker: "C", text: "Hello" }] }),
      { params }
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("script.invalidSpeaker");
  });

  it("returns 400 when text exceeds 500 chars", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
    });

    const res = await PUT(
      makeRequest({
        script: [{ speaker: "A", text: "a".repeat(501) }],
      }),
      { params }
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("script.lineTooLong");
  });

  it("saves script and returns 200 on success", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
    });
    mockPodcastUpdate.mockResolvedValue({ id: "p1" });

    const res = await PUT(makeRequest({ script: validScript }), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPodcastUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { script: validScript, status: "script_ready" },
    });
  });

  it("returns 500 on unexpected error", async () => {
    mockGetCurrentUser.mockRejectedValue(new Error("db down"));

    const res = await PUT(makeRequest({ script: validScript }), { params });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.errorKey).toBe("script.saveFailed");
  });
});
