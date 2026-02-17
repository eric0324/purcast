import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetCurrentUser,
  mockVoiceCreate,
  mockUploadFile,
  mockCloneVoice,
  mockCheckFeatureAccess,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockVoiceCreate: vi.fn(),
  mockUploadFile: vi.fn(),
  mockCloneVoice: vi.fn(),
  mockCheckFeatureAccess: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    voice: {
      create: mockVoiceCreate,
    },
  },
}));

vi.mock("@/lib/r2/utils", () => ({
  uploadFile: mockUploadFile,
  deleteFile: vi.fn(),
}));

vi.mock("@/lib/billing/feature-gate", () => ({
  checkFeatureAccess: mockCheckFeatureAccess,
}));

vi.mock("@/lib/tts/provider", () => ({
  createTTSProvider: () => ({
    cloneVoice: mockCloneVoice,
    deleteVoice: vi.fn(),
    synthesize: vi.fn(),
  }),
}));

import { POST } from "../route";

function makeFormDataRequest(fields: Record<string, string | Blob>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return new NextRequest("http://localhost/api/voices", {
    method: "POST",
    body: formData,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckFeatureAccess.mockResolvedValue(true);
});

describe("POST /api/voices", () => {
  it("returns 403 when free user attempts voice clone", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockCheckFeatureAccess.mockResolvedValue(false);

    const req = makeFormDataRequest({
      name: "My Voice",
      file: new Blob(["audio"], { type: "audio/mpeg" }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.errorKey).toBe("feature.proOnly");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const req = makeFormDataRequest({
      name: "My Voice",
      file: new Blob(["audio"], { type: "audio/mpeg" }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.errorKey).toBe("unauthorized");
  });

  it("returns 400 when name is missing", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });

    const req = makeFormDataRequest({
      file: new Blob(["audio"], { type: "audio/mpeg" }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("voice.nameRequired");
  });

  it("returns 400 when file is missing", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });

    const req = makeFormDataRequest({ name: "My Voice" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("voice.fileRequired");
  });

  it("returns 400 when file exceeds 25MB", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });

    const largeBlob = new Blob([new ArrayBuffer(26 * 1024 * 1024)], {
      type: "audio/mpeg",
    });
    const req = makeFormDataRequest({
      name: "My Voice",
      file: largeBlob,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("voice.fileTooLarge");
  });

  it("returns 400 for unsupported file format", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });

    const req = makeFormDataRequest({
      name: "My Voice",
      file: new Blob(["audio"], { type: "video/mp4" }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("voice.unsupportedFormat");
  });

  it("returns 200 on success with voice data", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockUploadFile.mockResolvedValue("https://r2.example.com/voices/sample.mp3");
    mockCloneVoice.mockResolvedValue("el-voice-123");
    mockVoiceCreate.mockResolvedValue({
      id: "voice-1",
      name: "My Voice",
      elevenlabsVoiceId: "el-voice-123",
      sampleUrl: "https://r2.example.com/voices/sample.mp3",
    });

    const req = makeFormDataRequest({
      name: "My Voice",
      file: new Blob(["audio-data"], { type: "audio/mpeg" }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.voice).toEqual(
      expect.objectContaining({
        id: "voice-1",
        name: "My Voice",
      })
    );
  });

  it("uploads to R2 then clones with ElevenLabs", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockUploadFile.mockResolvedValue("https://r2.example.com/voices/sample.mp3");
    mockCloneVoice.mockResolvedValue("el-voice-123");
    mockVoiceCreate.mockResolvedValue({
      id: "voice-1",
      name: "My Voice",
      elevenlabsVoiceId: "el-voice-123",
      sampleUrl: "https://r2.example.com/voices/sample.mp3",
    });

    const req = makeFormDataRequest({
      name: "My Voice",
      file: new Blob(["audio-data"], { type: "audio/mpeg" }),
    });
    await POST(req);

    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.stringContaining("voices/"),
      expect.any(Buffer),
      "audio/mpeg"
    );
    expect(mockCloneVoice).toHaveBeenCalledWith(
      expect.any(Buffer),
      "My Voice"
    );
  });

  it("returns 500 and cleans up R2 when clone fails", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockUploadFile.mockResolvedValue("https://r2.example.com/voices/sample.mp3");
    mockCloneVoice.mockRejectedValue(new Error("Clone failed"));

    const req = makeFormDataRequest({
      name: "My Voice",
      file: new Blob(["audio-data"], { type: "audio/mpeg" }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.errorKey).toBe("voice.cloneFailed");
  });
});
