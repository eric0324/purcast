import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetCurrentUser,
  mockPodcastFindUnique,
  mockPodcastUpdate,
  mockGenerateScript,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockPodcastFindUnique: vi.fn(),
  mockPodcastUpdate: vi.fn(),
  mockGenerateScript: vi.fn(),
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

vi.mock("@/lib/llm/provider", () => ({
  createLLMProvider: () => ({
    generateScript: mockGenerateScript,
  }),
}));

import { POST } from "@/app/api/generate-script/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/generate-script", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const mockScript = [
  { speaker: "A", text: "Hello" },
  { speaker: "B", text: "Hi there" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/generate-script", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const res = await POST(makeRequest({ podcastId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.errorKey).toBe("unauthorized");
  });

  it("returns 400 when podcastId is missing", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });

    const res = await POST(makeRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("script.podcastIdRequired");
  });

  it("returns 404 when podcast does not exist", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ podcastId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.errorKey).toBe("script.podcastNotFound");
  });

  it("returns 404 when podcast belongs to another user", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-2",
      status: "pending",
      sourceContent: "content",
    });

    const res = await POST(makeRequest({ podcastId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.errorKey).toBe("script.podcastNotFound");
  });

  it("returns existing script when status is script_ready", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
      status: "script_ready",
      script: mockScript,
      sourceContent: "content",
    });

    const res = await POST(makeRequest({ podcastId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.script).toEqual(mockScript);
    expect(mockGenerateScript).not.toHaveBeenCalled();
  });

  it("returns 409 when already generating", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
      status: "generating_script",
      sourceContent: "content",
    });

    const res = await POST(makeRequest({ podcastId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.errorKey).toBe("script.alreadyGenerating");
  });

  it("generates script and updates podcast on success", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
      status: "pending",
      sourceContent: "article content here",
    });
    mockPodcastUpdate.mockResolvedValue({ id: "p1" });
    mockGenerateScript.mockResolvedValue({
      title: "AI Generated Title",
      dialogue: mockScript,
    });

    const res = await POST(makeRequest({ podcastId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("script_ready");

    // Should update to generating_script first
    expect(mockPodcastUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: "generating_script" },
    });

    // Then update with script + script_ready + title
    expect(mockPodcastUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        script: mockScript,
        status: "script_ready",
        title: "AI Generated Title",
      },
    });
  });

  it("sets status to failed on LLM error", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
      status: "pending",
      sourceContent: "content",
    });
    mockPodcastUpdate.mockResolvedValue({ id: "p1" });
    mockGenerateScript.mockRejectedValue(new Error("LLM failed"));

    const res = await POST(makeRequest({ podcastId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("failed");
    expect(mockPodcastUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: "failed", errorMessage: "LLM failed" },
    });
  });

  it("returns 500 on unexpected error", async () => {
    mockGetCurrentUser.mockRejectedValue(new Error("db down"));

    const res = await POST(makeRequest({ podcastId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.errorKey).toBe("script.generateFailed");
  });
});
