import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/client", () => ({
  prisma: {
    job: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

import { POST } from "@/app/api/line/webhook/[jobId]/route";

const channelSecret = "test-channel-secret";

function makeSignature(body: string): string {
  return crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");
}

function makeRequest(jobId: string, body: object, signature?: string) {
  const bodyStr = JSON.stringify(body);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (signature) {
    headers["x-line-signature"] = signature;
  }

  const req = new NextRequest(`http://localhost/api/line/webhook/${jobId}`, {
    method: "POST",
    body: bodyStr,
    headers,
  });

  return { req, bodyStr };
}

const lineOutputConfig = [
  {
    type: "line" as const,
    channelAccessToken: "encrypted-token",
    lineUserIds: ["existing-user"],
    format: "both" as const,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("LINE_CHANNEL_SECRET", channelSecret);
  mockUpdate.mockResolvedValue({});
});

describe("POST /api/line/webhook/[jobId]", () => {
  it("returns 404 when job not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    const body = { events: [] };
    const bodyStr = JSON.stringify(body);
    const { req } = makeRequest("nonexistent", body, makeSignature(bodyStr));

    const res = await POST(req, { params: Promise.resolve({ jobId: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when LINE not configured for job", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-1",
      outputConfig: [{ type: "telegram", chatId: "123", format: "audio" }],
    });

    const body = { events: [] };
    const bodyStr = JSON.stringify(body);
    const { req } = makeRequest("job-1", body, makeSignature(bodyStr));

    const res = await POST(req, { params: Promise.resolve({ jobId: "job-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 403 when signature is invalid", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-1",
      outputConfig: lineOutputConfig,
    });

    const body = { events: [] };
    const { req } = makeRequest("job-1", body, "invalid-signature");

    const res = await POST(req, { params: Promise.resolve({ jobId: "job-1" }) });
    expect(res.status).toBe(403);
  });

  it("adds new user on follow event", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-1",
      outputConfig: lineOutputConfig,
    });

    const body = {
      events: [
        {
          type: "follow",
          source: { userId: "new-line-user", type: "user" },
        },
      ],
    };
    const bodyStr = JSON.stringify(body);
    const { req } = makeRequest("job-1", body, makeSignature(bodyStr));

    const res = await POST(req, { params: Promise.resolve({ jobId: "job-1" }) });
    expect(res.status).toBe(200);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job-1" },
        data: {
          outputConfig: expect.arrayContaining([
            expect.objectContaining({
              type: "line",
              lineUserIds: ["existing-user", "new-line-user"],
            }),
          ]),
        },
      })
    );
  });

  it("does not add duplicate user", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-1",
      outputConfig: lineOutputConfig,
    });

    const body = {
      events: [
        {
          type: "follow",
          source: { userId: "existing-user", type: "user" },
        },
      ],
    };
    const bodyStr = JSON.stringify(body);
    const { req } = makeRequest("job-1", body, makeSignature(bodyStr));

    const res = await POST(req, { params: Promise.resolve({ jobId: "job-1" }) });
    expect(res.status).toBe(200);

    // Should NOT call update since user already exists
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("removes user on unfollow event", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-1",
      outputConfig: [
        {
          type: "line",
          channelAccessToken: "token",
          lineUserIds: ["existing-user", "another-user"],
          format: "both",
        },
      ],
    });

    const body = {
      events: [
        {
          type: "unfollow",
          source: { userId: "existing-user", type: "user" },
        },
      ],
    };
    const bodyStr = JSON.stringify(body);
    const { req } = makeRequest("job-1", body, makeSignature(bodyStr));

    const res = await POST(req, { params: Promise.resolve({ jobId: "job-1" }) });
    expect(res.status).toBe(200);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          outputConfig: expect.arrayContaining([
            expect.objectContaining({
              lineUserIds: ["another-user"],
            }),
          ]),
        },
      })
    );
  });

  it("returns 200 even on internal errors", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB error"));

    const body = { events: [] };
    const bodyStr = JSON.stringify(body);
    const { req } = makeRequest("job-1", body, makeSignature(bodyStr));

    const res = await POST(req, { params: Promise.resolve({ jobId: "job-1" }) });
    expect(res.status).toBe(200);
  });
});
