import { describe, it, expect } from "vitest";
import { keywordFilter } from "@/lib/jobs/filtering/keyword-filter";
import type { FetchedArticle } from "@/lib/jobs/sources/types";

const articles: FetchedArticle[] = [
  { title: "AI Product Launch", url: "https://a.com/1", content: "New AI product for enterprise" },
  { title: "JavaScript Framework", url: "https://a.com/2", content: "A new JS framework released" },
  { title: "Sponsored: Buy Now", url: "https://a.com/3", content: "廣告 best deals today" },
  { title: "LLM Research Paper", url: "https://a.com/4", content: "Academic paper about transformers" },
  { title: "Cooking Recipe", url: "https://a.com/5", content: "How to make pasta" },
];

describe("keywordFilter", () => {
  it("should filter by include keywords", () => {
    const result = keywordFilter(articles, ["AI", "LLM"]);
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.url)).toEqual(["https://a.com/1", "https://a.com/4"]);
  });

  it("should filter by exclude keywords", () => {
    const result = keywordFilter(articles, undefined, ["廣告", "sponsored"]);
    expect(result).toHaveLength(4);
    expect(result.every((a) => !a.url.includes("/3"))).toBe(true);
  });

  it("should apply include then exclude", () => {
    const result = keywordFilter(articles, ["AI", "LLM"], ["academic"]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("AI Product Launch");
  });

  it("should be case-insensitive", () => {
    const result = keywordFilter(articles, ["ai"]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("AI Product Launch");
  });

  it("should match keywords in content", () => {
    const result = keywordFilter(articles, ["pasta"]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Cooking Recipe");
  });

  it("should pass all articles when no keywords configured", () => {
    const result = keywordFilter(articles, undefined, undefined);
    expect(result).toHaveLength(5);
  });

  it("should pass all articles with empty keyword arrays", () => {
    const result = keywordFilter(articles, [], []);
    expect(result).toHaveLength(5);
  });

  it("should return empty if include matches nothing", () => {
    const result = keywordFilter(articles, ["nonexistent"]);
    expect(result).toHaveLength(0);
  });
});
