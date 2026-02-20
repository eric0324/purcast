import type { JobSource } from "../types";
import type { FetchedArticle } from "./types";
import { fetchRSS } from "./rss";
import { fetchURLMonitor } from "./url-monitor";
import { fetchReddit } from "./reddit";

export async function fetchSources(
  sources: JobSource[]
): Promise<FetchedArticle[]> {
  const results = await Promise.all(
    sources.map((source) => fetchSource(source))
  );

  // Merge and deduplicate by URL
  const seen = new Set<string>();
  const merged: FetchedArticle[] = [];

  for (const articles of results) {
    for (const article of articles) {
      if (seen.has(article.url)) continue;
      seen.add(article.url);
      merged.push(article);
    }
  }

  // Sort by publishedAt (newest first), articles without date go last
  merged.sort((a, b) => {
    if (!a.publishedAt && !b.publishedAt) return 0;
    if (!a.publishedAt) return 1;
    if (!b.publishedAt) return -1;
    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });

  return merged;
}

async function fetchSource(source: JobSource): Promise<FetchedArticle[]> {
  switch (source.type) {
    case "rss":
      return fetchRSS(source.url);
    case "url":
      return fetchURLMonitor(source.url);
    case "reddit":
      return fetchReddit(source.url, {
        sort: source.sort,
        includeComments: source.includeComments,
      });
    default:
      console.warn(`[Sources] Unknown source type: ${(source as JobSource).type}`);
      return [];
  }
}

export type { FetchedArticle } from "./types";
