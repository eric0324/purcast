import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockParseURL } = vi.hoisted(() => ({
  mockParseURL: vi.fn(),
}));

vi.mock("rss-parser", () => ({
  default: class MockParser {
    parseURL = mockParseURL;
  },
}));

vi.mock("@/lib/jobs/sources/extract-content", () => ({
  extractArticleContent: vi.fn().mockResolvedValue("Extracted article content for testing purposes that is long enough."),
}));

import { fetchRSS } from "@/lib/jobs/sources/rss";

describe("fetchRSS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should parse a valid RSS feed and return articles", async () => {
    mockParseURL.mockResolvedValue({
      items: [
        {
          title: "Article One",
          link: "https://example.com/article-1",
          "content:encoded": "<p>This is the full content of article one. ".repeat(20) + "</p>",
          pubDate: "2026-02-18T08:00:00Z",
        },
        {
          title: "Article Two",
          link: "https://example.com/article-2",
          contentSnippet: "Short snippet",
          pubDate: "2026-02-17T08:00:00Z",
        },
      ],
    });

    const articles = await fetchRSS("https://example.com/feed.xml");

    expect(articles).toHaveLength(2);
    expect(articles[0].title).toBe("Article One");
    expect(articles[0].url).toBe("https://example.com/article-1");
    expect(articles[0].content).not.toContain("<p>");
    expect(articles[0].publishedAt).toEqual(new Date("2026-02-18T08:00:00Z"));

    // Second article has short content, should use extractArticleContent
    expect(articles[1].title).toBe("Article Two");
  });

  it("should skip items without a link", async () => {
    mockParseURL.mockResolvedValue({
      items: [
        { title: "No Link Article", content: "Some content".repeat(30) },
        { title: "Has Link", link: "https://example.com/ok", content: "Full content here. ".repeat(20) },
      ],
    });

    const articles = await fetchRSS("https://example.com/feed.xml");
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe("Has Link");
  });

  it("should return empty array on invalid feed", async () => {
    mockParseURL.mockRejectedValue(new Error("Invalid XML"));

    const articles = await fetchRSS("https://example.com/bad-feed");
    expect(articles).toEqual([]);
  });

  it("should return empty array on network error", async () => {
    mockParseURL.mockRejectedValue(new Error("ECONNREFUSED"));

    const articles = await fetchRSS("https://unreachable.example.com/feed");
    expect(articles).toEqual([]);
  });

  it("should use inline content when it is long enough", async () => {
    const longContent = "<p>" + "Word ".repeat(100) + "</p>";
    mockParseURL.mockResolvedValue({
      items: [
        {
          title: "Rich Content",
          link: "https://example.com/rich",
          "content:encoded": longContent,
        },
      ],
    });

    const articles = await fetchRSS("https://example.com/feed.xml");
    expect(articles).toHaveLength(1);
    expect(articles[0].content).not.toContain("<p>");
    expect(articles[0].content).toContain("Word");
  });

  it("should handle empty feed items", async () => {
    mockParseURL.mockResolvedValue({ items: [] });

    const articles = await fetchRSS("https://example.com/empty-feed");
    expect(articles).toEqual([]);
  });
});
