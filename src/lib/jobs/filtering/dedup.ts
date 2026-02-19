import { prisma } from "@/lib/db/client";
import type { FetchedArticle } from "../sources/types";

export async function deduplicateArticles(
  articles: FetchedArticle[],
  jobId: string
): Promise<FetchedArticle[]> {
  if (articles.length === 0) return [];

  const urls = articles.map((a) => a.url);

  const existing = await prisma.jobArticle.findMany({
    where: { jobId, url: { in: urls } },
    select: { url: true },
  });

  const existingUrls = new Set(existing.map((e) => e.url));

  return articles.filter((article) => !existingUrls.has(article.url));
}
