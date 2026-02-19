import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractArticleContent } from "@/lib/jobs/sources/extract-content";

function makeResponse(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  };
}

describe("extractArticleContent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should extract content from <article> element", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeResponse(`
        <html><body>
          <nav>Navigation stuff</nav>
          <article><p>This is the main article content that should be extracted for the podcast generation pipeline. It contains enough text to pass the minimum length threshold of one hundred characters easily.</p></article>
          <footer>Footer stuff</footer>
        </body></html>
      `) as Response
    );

    const content = await extractArticleContent("https://example.com/post");
    expect(content).toContain("main article content");
    expect(content).not.toContain("Navigation");
    expect(content).not.toContain("Footer");
  });

  it("should extract content from <main> element", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeResponse(`
        <html><body>
          <header>Header</header>
          <main><p>Main content area with enough text to pass the minimum length threshold for extraction. This paragraph needs to be longer than one hundred characters to be considered valid content by the extractor.</p></main>
        </body></html>
      `) as Response
    );

    const content = await extractArticleContent("https://example.com/post");
    expect(content).toContain("Main content area");
  });

  it("should return empty string on non-200 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeResponse("Not Found", 404) as Response
    );

    const content = await extractArticleContent("https://example.com/missing");
    expect(content).toBe("");
  });

  it("should return empty string on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const content = await extractArticleContent("https://example.com/down");
    expect(content).toBe("");
  });

  it("should return empty string for pages with no meaningful content", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeResponse(`<html><body><p>Hi</p></body></html>`) as Response
    );

    const content = await extractArticleContent("https://example.com/empty");
    expect(content).toBe("");
  });

  it("should strip script and style elements", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeResponse(`
        <html><body>
          <article>
            <script>alert('xss')</script>
            <style>.hidden { display: none; }</style>
            <p>Clean article content that is extracted after removing scripts and style elements from the HTML document. This paragraph also needs to exceed the minimum character threshold to be valid.</p>
          </article>
        </body></html>
      `) as Response
    );

    const content = await extractArticleContent("https://example.com/post");
    expect(content).toContain("Clean article content");
    expect(content).not.toContain("alert");
    expect(content).not.toContain("display");
  });
});
