import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetCurrentUser,
  mockVoiceFindUnique,
  mockVoiceDelete,
  mockDeleteFile,
  mockDeleteVoice,
  mockCheckFeatureAccess,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockVoiceFindUnique: vi.fn(),
  mockVoiceDelete: vi.fn(),
  mockDeleteFile: vi.fn(),
  mockDeleteVoice: vi.fn(),
  mockCheckFeatureAccess: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    voice: {
      findUnique: mockVoiceFindUnique,
      delete: mockVoiceDelete,
    },
  },
}));

vi.mock("@/lib/r2/utils", () => ({
  deleteFile: mockDeleteFile,
}));

vi.mock("@/lib/billing/feature-gate", () => ({
  checkFeatureAccess: mockCheckFeatureAccess,
}));

vi.mock("@/lib/tts/provider", () => ({
  createTTSProvider: () => ({
    deleteVoice: mockDeleteVoice,
    cloneVoice: vi.fn(),
    synthesize: vi.fn(),
  }),
}));

import { DELETE } from "../route";

function makeRequest(id: string) {
  return new NextRequest(`http://localhost/api/voices/${id}`, {
    method: "DELETE",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckFeatureAccess.mockResolvedValue(true);
});

describe("DELETE /api/voices/[id]", () => {
  const params = { params: Promise.resolve({ id: "voice-1" }) };

  it("returns 403 when free user attempts to delete voice", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockCheckFeatureAccess.mockResolvedValue(false);

    const res = await DELETE(makeRequest("voice-1"), params);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.errorKey).toBe("feature.proOnly");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const res = await DELETE(makeRequest("voice-1"), params);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.errorKey).toBe("unauthorized");
  });

  it("returns 404 when voice does not exist", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockVoiceFindUnique.mockResolvedValue(null);

    const res = await DELETE(makeRequest("voice-1"), params);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.errorKey).toBe("voice.notFound");
  });

  it("returns 404 when voice belongs to another user", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockVoiceFindUnique.mockResolvedValue({
      id: "voice-1",
      userId: "user-2",
      elevenlabsVoiceId: "el-123",
      sampleUrl: "https://r2/sample.mp3",
    });

    const res = await DELETE(makeRequest("voice-1"), params);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.errorKey).toBe("voice.notFound");
  });

  it("returns 200 and deletes from ElevenLabs + DB + R2", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockVoiceFindUnique.mockResolvedValue({
      id: "voice-1",
      userId: "user-1",
      elevenlabsVoiceId: "el-123",
      sampleUrl: "https://r2.example.com/voices/sample.mp3",
    });
    mockDeleteVoice.mockResolvedValue(undefined);
    mockVoiceDelete.mockResolvedValue({ id: "voice-1" });
    mockDeleteFile.mockResolvedValue(undefined);

    const res = await DELETE(makeRequest("voice-1"), params);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteVoice).toHaveBeenCalledWith("el-123");
    expect(mockVoiceDelete).toHaveBeenCalledWith({
      where: { id: "voice-1" },
    });
  });

  it("still deletes DB + R2 even if ElevenLabs delete fails", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockVoiceFindUnique.mockResolvedValue({
      id: "voice-1",
      userId: "user-1",
      elevenlabsVoiceId: "el-123",
      sampleUrl: "https://r2.example.com/voices/sample.mp3",
    });
    mockDeleteVoice.mockRejectedValue(new Error("ElevenLabs error"));
    mockVoiceDelete.mockResolvedValue({ id: "voice-1" });
    mockDeleteFile.mockResolvedValue(undefined);

    const res = await DELETE(makeRequest("voice-1"), params);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockVoiceDelete).toHaveBeenCalled();
  });
});
