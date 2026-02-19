import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/client");

import { prisma } from "@/lib/db/client";
import { deduplicateArticles } from "@/lib/jobs/filtering/dedup";
import type { FetchedArticle } from "@/lib/jobs/sources/types";

const mockPrisma = prisma as unknown as {
  jobArticle: { findMany: ReturnType<typeof vi.fn> };
};

const articles: FetchedArticle[] = [
  { title: "Article 1", url: "https://example.com/a1", content: "Content 1" },
  { title: "Article 2", url: "https://example.com/a2", content: "Content 2" },
  { title: "Article 3", url: "https://example.com/a3", content: "Content 3" },
];

describe("deduplicateArticles", () => {
  it("should return all articles when none exist in DB", async () => {
    mockPrisma.jobArticle.findMany.mockResolvedValue([]);

    const result = await deduplicateArticles(articles, "job-1");
    expect(result).toHaveLength(3);
  });

  it("should filter out already processed articles", async () => {
    mockPrisma.jobArticle.findMany.mockResolvedValue([
      { url: "https://example.com/a1" },
      { url: "https://example.com/a3" },
    ]);

    const result = await deduplicateArticles(articles, "job-1");
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://example.com/a2");
  });

  it("should return empty array when all are duplicates", async () => {
    mockPrisma.jobArticle.findMany.mockResolvedValue(
      articles.map((a) => ({ url: a.url }))
    );

    const result = await deduplicateArticles(articles, "job-1");
    expect(result).toHaveLength(0);
  });

  it("should return empty array for empty input", async () => {
    const result = await deduplicateArticles([], "job-1");
    expect(result).toHaveLength(0);
    expect(mockPrisma.jobArticle.findMany).not.toHaveBeenCalled();
  });

  it("should query with correct jobId and urls", async () => {
    mockPrisma.jobArticle.findMany.mockResolvedValue([]);

    await deduplicateArticles(articles, "job-123");
    expect(mockPrisma.jobArticle.findMany).toHaveBeenCalledWith({
      where: {
        jobId: "job-123",
        url: { in: ["https://example.com/a1", "https://example.com/a2", "https://example.com/a3"] },
      },
      select: { url: true },
    });
  });
});
