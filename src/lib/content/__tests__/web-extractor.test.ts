import { describe, it, expect, vi, beforeEach } from "vitest";
import { webExtractor, ExtractError } from "../extractors/web";
import { CONTENT_MAX_LENGTH } from "../clean";

// Sample valid HTML that Readability can parse
function makeHtml(body: string, title = "Test Article") {
  return `<!DOCTYPE html>
<html><head><title>${title}</title></head>
<body>
  <article>
    <h1>${title}</h1>
    ${body}
  </article>
</body></html>`;
}

// Generate long paragraph content
function makeLongContent(length: number) {
  const word = "lorem ";
  const repeated = word.repeat(Math.ceil(length / word.length));
  return `<p>${repeated.slice(0, length)}</p>`;
}

describe("webExtractor.canHandle", () => {
  it("returns true for http URLs", () => {
    expect(webExtractor.canHandle("http://example.com")).toBe(true);
  });

  it("returns true for https URLs", () => {
    expect(webExtractor.canHandle("https://example.com/article")).toBe(true);
  });

  it("returns false for non-URL strings", () => {
    expect(webExtractor.canHandle("not a url")).toBe(false);
    expect(webExtractor.canHandle("ftp://example.com")).toBe(false);
    expect(webExtractor.canHandle("")).toBe(false);
  });
});

describe("webExtractor.extract", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("successfully extracts title and content", async () => {
    const html = makeHtml(
      "<p>" + "This is a test paragraph with enough content. ".repeat(10) + "</p>"
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    );

    const result = await webExtractor.extract("https://example.com/article");
    expect(result.title).toBe("Test Article");
    expect(result.content).toContain("This is a test paragraph");
    expect(result.sourceUrl).toBe("https://example.com/article");
    expect(result.truncated).toBe(false);
  });

  it("throws TIMEOUT on fetch timeout", async () => {
    const timeoutError = new DOMException("The operation was aborted.", "TimeoutError");
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(timeoutError);

    await expect(
      webExtractor.extract("https://example.com/slow")
    ).rejects.toThrow(ExtractError);

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(timeoutError);

    await expect(
      webExtractor.extract("https://example.com/slow")
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("throws FETCH_FAILED on non-2xx response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );

    await expect(
      webExtractor.extract("https://example.com/missing")
    ).rejects.toThrow(ExtractError);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Server Error", { status: 500 })
    );

    await expect(
      webExtractor.extract("https://example.com/error")
    ).rejects.toMatchObject({ code: "FETCH_FAILED" });
  });

  it("throws HTML_TOO_LARGE when content-length exceeds limit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", {
        status: 200,
        headers: { "Content-Length": "3000000" },
      })
    );

    await expect(
      webExtractor.extract("https://example.com/huge")
    ).rejects.toThrow(ExtractError);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", {
        status: 200,
        headers: { "Content-Length": "3000000" },
      })
    );

    await expect(
      webExtractor.extract("https://example.com/huge")
    ).rejects.toMatchObject({ code: "HTML_TOO_LARGE" });
  });

  it("throws PARSE_FAILED when Readability cannot parse", async () => {
    // Minimal HTML with no article-like content
    const emptyHtml = "<html><head></head><body></body></html>";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(emptyHtml, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    );

    await expect(
      webExtractor.extract("https://example.com/empty")
    ).rejects.toThrow(ExtractError);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(emptyHtml, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    );

    await expect(
      webExtractor.extract("https://example.com/empty")
    ).rejects.toMatchObject({ code: "PARSE_FAILED" });
  });

  it("returns truncated: true when content exceeds max length", async () => {
    const longContent = makeLongContent(CONTENT_MAX_LENGTH + 1000);
    const html = makeHtml(longContent);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    );

    const result = await webExtractor.extract("https://example.com/long");
    expect(result.truncated).toBe(true);
    expect(result.content.length).toBe(CONTENT_MAX_LENGTH);
  });

  it("throws FETCH_FAILED on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new TypeError("fetch failed")
    );

    await expect(
      webExtractor.extract("https://example.com/offline")
    ).rejects.toMatchObject({ code: "FETCH_FAILED" });
  });
});
