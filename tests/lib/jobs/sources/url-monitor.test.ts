import { describe, it, expect } from "vitest";
import { extractArticleLinks } from "@/lib/jobs/sources/url-monitor";

describe("extractArticleLinks", () => {
  const baseUrl = new URL("https://blog.example.com");

  function makeHtml(links: string[]): string {
    const anchors = links.map((href) => `<a href="${href}">Link</a>`).join("\n");
    return `<html><body><main>${anchors}</main></body></html>`;
  }

  it("should extract article-like links with date segments", () => {
    const html = makeHtml([
      "/2026/02/my-great-post",
      "/2026/01/another-post",
    ]);

    const result = extractArticleLinks(html, baseUrl);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("https://blog.example.com/2026/02/my-great-post");
    expect(result[1]).toBe("https://blog.example.com/2026/01/another-post");
  });

  it("should extract slug-like links with sufficient depth", () => {
    const html = makeHtml([
      "/posts/my-article-title",
      "/blog/hello-world",
    ]);

    const result = extractArticleLinks(html, baseUrl);
    expect(result).toHaveLength(2);
  });

  it("should filter out category/tag/author pages", () => {
    const html = makeHtml([
      "/category/tech",
      "/tag/javascript",
      "/author/john",
      "/posts/real-article",
    ]);

    const result = extractArticleLinks(html, baseUrl);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("real-article");
  });

  it("should filter out external domain links", () => {
    const html = makeHtml([
      "https://other-site.com/2026/02/article",
      "/2026/02/local-article",
    ]);

    const result = extractArticleLinks(html, baseUrl);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("local-article");
  });

  it("should filter out file extensions", () => {
    const html = makeHtml([
      "/assets/image.png",
      "/docs/manual.pdf",
      "/posts/real-article",
    ]);

    const result = extractArticleLinks(html, baseUrl);
    expect(result).toHaveLength(1);
  });

  it("should skip homepage link", () => {
    const html = makeHtml([
      "/",
      "/2026/02/an-article",
    ]);

    const result = extractArticleLinks(html, baseUrl);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("an-article");
  });

  it("should deduplicate same URLs", () => {
    const html = makeHtml([
      "/2026/02/duplicate-post",
      "/2026/02/duplicate-post",
      "/2026/02/duplicate-post",
    ]);

    const result = extractArticleLinks(html, baseUrl);
    expect(result).toHaveLength(1);
  });

  it("should remove links inside nav/footer elements", () => {
    const html = `
      <html><body>
        <nav><a href="/2026/02/nav-link">Nav</a></nav>
        <main><a href="/2026/02/real-article">Article</a></main>
        <footer><a href="/2026/02/footer-link">Footer</a></footer>
      </body></html>
    `;

    const result = extractArticleLinks(html, baseUrl);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("real-article");
  });

  it("should skip javascript and mailto links", () => {
    const html = makeHtml([
      "javascript:void(0)",
      "mailto:test@example.com",
      "#section",
      "/2026/02/valid-article",
    ]);

    const result = extractArticleLinks(html, baseUrl);
    expect(result).toHaveLength(1);
  });

  it("should reject shallow single-segment paths without date", () => {
    const html = makeHtml([
      "/about",
      "/contact",
      "/single-page",
    ]);

    const result = extractArticleLinks(html, baseUrl);
    expect(result).toHaveLength(0);
  });
});

