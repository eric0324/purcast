import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetCurrentUser, mockGetExtractor, mockExtract } = vi.hoisted(
  () => ({
    mockGetCurrentUser: vi.fn(),
    mockGetExtractor: vi.fn(),
    mockExtract: vi.fn(),
  })
);

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/content/extractors", () => ({
  getExtractor: mockGetExtractor,
}));

import { POST } from "@/app/api/extract/route";
import { ExtractError } from "@/lib/content/extractors/web";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/extract", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/extract", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const res = await POST(makeRequest({ url: "https://example.com" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.errorKey).toBe("unauthorized");
  });

  it("returns 400 when url is missing", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });

    const res = await POST(makeRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("extract.urlRequired");
  });

  it("returns 400 when url is invalid format", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });

    const res = await POST(makeRequest({ url: "not-a-url" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("extract.invalidUrl");
  });

  it("returns 400 when no extractor can handle the url", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockGetExtractor.mockReturnValue(null);

    const res = await POST(makeRequest({ url: "https://example.com" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("extract.invalidUrl");
  });

  it("returns 200 with extracted content on success", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    const mockExtractorInstance = { canHandle: vi.fn(), extract: mockExtract };
    mockGetExtractor.mockReturnValue(mockExtractorInstance);
    mockExtract.mockResolvedValue({
      title: "Test Article",
      content: "Article content here",
      sourceUrl: "https://example.com/article",
      truncated: false,
    });

    const res = await POST(
      makeRequest({ url: "https://example.com/article" })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      title: "Test Article",
      content: "Article content here",
      url: "https://example.com/article",
      truncated: false,
    });
  });

  it("returns 408 on ExtractError TIMEOUT", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    const mockExtractorInstance = { canHandle: vi.fn(), extract: mockExtract };
    mockGetExtractor.mockReturnValue(mockExtractorInstance);
    mockExtract.mockRejectedValue(new ExtractError("TIMEOUT"));

    const res = await POST(makeRequest({ url: "https://example.com/slow" }));
    const data = await res.json();

    expect(res.status).toBe(408);
    expect(data.errorKey).toBe("extract.timeout");
  });

  it("returns 413 on ExtractError HTML_TOO_LARGE", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    const mockExtractorInstance = { canHandle: vi.fn(), extract: mockExtract };
    mockGetExtractor.mockReturnValue(mockExtractorInstance);
    mockExtract.mockRejectedValue(new ExtractError("HTML_TOO_LARGE"));

    const res = await POST(makeRequest({ url: "https://example.com/huge" }));
    const data = await res.json();

    expect(res.status).toBe(413);
    expect(data.errorKey).toBe("extract.htmlTooLarge");
  });

  it("returns 400 on ExtractError FETCH_FAILED", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    const mockExtractorInstance = { canHandle: vi.fn(), extract: mockExtract };
    mockGetExtractor.mockReturnValue(mockExtractorInstance);
    mockExtract.mockRejectedValue(new ExtractError("FETCH_FAILED"));

    const res = await POST(
      makeRequest({ url: "https://example.com/missing" })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errorKey).toBe("extract.fetchFailed");
  });

  it("returns 422 on ExtractError PARSE_FAILED", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    const mockExtractorInstance = { canHandle: vi.fn(), extract: mockExtract };
    mockGetExtractor.mockReturnValue(mockExtractorInstance);
    mockExtract.mockRejectedValue(new ExtractError("PARSE_FAILED"));

    const res = await POST(
      makeRequest({ url: "https://example.com/broken" })
    );
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.errorKey).toBe("extract.parseFailed");
  });

  it("returns 500 on unexpected error", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    const mockExtractorInstance = { canHandle: vi.fn(), extract: mockExtract };
    mockGetExtractor.mockReturnValue(mockExtractorInstance);
    mockExtract.mockRejectedValue(new Error("unexpected"));

    const res = await POST(
      makeRequest({ url: "https://example.com/error" })
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.errorKey).toBe("extract.failed");
  });
});
