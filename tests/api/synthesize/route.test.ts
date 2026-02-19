import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetCurrentUser,
  mockPodcastFindUnique,
  mockPodcastUpdate,
  mockSynthesizeScript,
  mockConcatAudioSegments,
  mockGetAudioDuration,
  mockUploadFile,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockPodcastFindUnique: vi.fn(),
  mockPodcastUpdate: vi.fn(),
  mockSynthesizeScript: vi.fn(),
  mockConcatAudioSegments: vi.fn(),
  mockGetAudioDuration: vi.fn(),
  mockUploadFile: vi.fn(),
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

vi.mock("@/lib/tts/provider", () => ({
  createTTSProvider: () => ({
    synthesize: vi.fn(),
    cloneVoice: vi.fn(),
    deleteVoice: vi.fn(),
  }),
}));

vi.mock("@/lib/tts/synthesize-script", () => ({
  synthesizeScript: mockSynthesizeScript,
}));

vi.mock("@/lib/audio/concat", () => ({
  concatAudioSegments: mockConcatAudioSegments,
}));

vi.mock("@/lib/audio/duration", () => ({
  getAudioDuration: mockGetAudioDuration,
}));

vi.mock("@/lib/r2/utils", () => ({
  uploadFile: mockUploadFile,
}));

import { POST } from "@/app/api/synthesize/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/synthesize", {
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
  mockPodcastUpdate.mockResolvedValue({ id: "p1" });
  process.env.FISH_AUDIO_DEFAULT_VOICE_A = "default-voice-a";
  process.env.FISH_AUDIO_DEFAULT_VOICE_B = "default-voice-b";
});

describe("POST /api/synthesize", () => {
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
    expect(data.errorKey).toBe("synthesize.podcastIdRequired");
  });

  it("returns 404 when podcast does not exist", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ podcastId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.errorKey).toBe("synthesize.podcastNotFound");
  });

  it("returns 404 when podcast belongs to another user", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-2",
      status: "script_ready",
      script: mockScript,
    });

    const res = await POST(makeRequest({ podcastId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.errorKey).toBe("synthesize.podcastNotFound");
  });

  it("returns 409 when status is not script_ready or failed", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
      status: "generating_script",
      script: mockScript,
    });

    const res = await POST(makeRequest({ podcastId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.errorKey).toBe("synthesize.invalidStatus");
  });

  it("allows retry when status is failed and script exists", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
      status: "failed",
      script: mockScript,
    });

    mockSynthesizeScript.mockResolvedValue([
      Buffer.from("audio1"),
      Buffer.from("audio2"),
    ]);
    mockConcatAudioSegments.mockResolvedValue(Buffer.from("final-mp3"));
    mockGetAudioDuration.mockResolvedValue(90);
    mockUploadFile.mockResolvedValue("https://r2.example.com/podcasts/p1.mp3");

    const res = await POST(makeRequest({ podcastId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(202);
    expect(data.status).toBe("generating_audio");
  });

  it("returns 409 when status is failed but no script", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
      status: "failed",
      script: null,
    });

    const res = await POST(makeRequest({ podcastId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.errorKey).toBe("synthesize.invalidStatus");
  });

  it("returns 200 with existing audioUrl when already completed", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
      status: "completed",
      audioUrl: "https://r2.example.com/podcasts/output.mp3",
      script: mockScript,
    });

    const res = await POST(makeRequest({ podcastId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.audioUrl).toBe("https://r2.example.com/podcasts/output.mp3");
  });

  it("returns 202 and triggers background synthesis", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
      status: "script_ready",
      script: mockScript,
    });

    mockSynthesizeScript.mockResolvedValue([
      Buffer.from("audio1"),
      Buffer.from("audio2"),
    ]);
    mockConcatAudioSegments.mockResolvedValue(Buffer.from("final-mp3"));
    mockGetAudioDuration.mockResolvedValue(120);
    mockUploadFile.mockResolvedValue("https://r2.example.com/podcasts/p1.mp3");

    const res = await POST(makeRequest({ podcastId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(202);
    expect(data.status).toBe("generating_audio");

    // Wait for background process to complete
    await new Promise((r) => setTimeout(r, 50));

    // Should have set status to generating_audio first
    expect(mockPodcastUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: "generating_audio" },
    });
  });

  it("background process updates to completed on success", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
      status: "script_ready",
      script: mockScript,
    });

    mockSynthesizeScript.mockResolvedValue([
      Buffer.from("audio1"),
      Buffer.from("audio2"),
    ]);
    mockConcatAudioSegments.mockResolvedValue(Buffer.from("final-mp3"));
    mockGetAudioDuration.mockResolvedValue(120);
    mockUploadFile.mockResolvedValue("https://r2.example.com/podcasts/p1.mp3");

    await POST(makeRequest({ podcastId: "p1" }));

    // Wait for background process
    await new Promise((r) => setTimeout(r, 50));

    expect(mockPodcastUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        status: "completed",
        audioUrl: "https://r2.example.com/podcasts/p1.mp3",
        duration: 120,
      },
    });
  });

  it("background process updates to failed on error", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
      status: "script_ready",
      script: mockScript,
    });

    mockSynthesizeScript.mockRejectedValue(new Error("TTS failed"));

    await POST(makeRequest({ podcastId: "p1" }));

    // Wait for background process
    await new Promise((r) => setTimeout(r, 50));

    expect(mockPodcastUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        status: "failed",
        errorMessage: "TTS failed",
      },
    });
  });

  it("uses voice IDs from request body when provided", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPodcastFindUnique.mockResolvedValue({
      id: "p1",
      userId: "user-1",
      status: "script_ready",
      script: mockScript,
    });
    mockSynthesizeScript.mockResolvedValue([Buffer.from("audio")]);
    mockConcatAudioSegments.mockResolvedValue(Buffer.from("final"));
    mockGetAudioDuration.mockResolvedValue(60);
    mockUploadFile.mockResolvedValue("https://r2.example.com/p1.mp3");

    await POST(makeRequest({
      podcastId: "p1",
      voiceAId: "custom-voice-a",
      voiceBId: "custom-voice-b",
    }));

    // Wait for background process
    await new Promise((r) => setTimeout(r, 50));

    expect(mockSynthesizeScript).toHaveBeenCalledWith(
      expect.anything(),
      mockScript,
      "custom-voice-a",
      "custom-voice-b"
    );
  });
});
