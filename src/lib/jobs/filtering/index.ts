import type { FetchedArticle } from "../sources/types";
import type { JobFilterConfig } from "../types";
import type { SelectedArticle } from "../types";
import { keywordFilter } from "./keyword-filter";
import { deduplicateArticles } from "./dedup";
import { aiFilterArticles } from "@/lib/llm/filter";

export interface FilterResult {
  selected: FetchedArticle[];
  selectedMeta: SelectedArticle[];
}

export async function filterPipeline(
  articles: FetchedArticle[],
  filterConfig: JobFilterConfig,
  jobId: string,
  maxArticles: number
): Promise<FilterResult> {
  // Step 1: Keyword filtering (no quota)
  let filtered = keywordFilter(
    articles,
    filterConfig.includeKeywords,
    filterConfig.excludeKeywords
  );

  // Step 2: Deduplication against job_articles
  filtered = await deduplicateArticles(filtered, jobId);

  if (filtered.length === 0) {
    return { selected: [], selectedMeta: [] };
  }

  // Step 3: AI filtering (if configured, costs quota)
  if (filterConfig.aiPrompt) {
    const aiResult = await aiFilterArticles(filtered, filterConfig.aiPrompt, maxArticles);
    const urlToReason = new Map(aiResult.map((r) => [r.url, r.reason]));

    const selected = filtered.filter((a) => urlToReason.has(a.url)).slice(0, maxArticles);
    const selectedMeta = selected.map((a) => ({
      title: a.title,
      url: a.url,
      reason: urlToReason.get(a.url) || "",
    }));

    return { selected, selectedMeta };
  }

  // No AI filter: take most recent up to maxArticles
  const selected = filtered.slice(0, maxArticles);
  const selectedMeta = selected.map((a) => ({
    title: a.title,
    url: a.url,
    reason: "Passed keyword filter",
  }));

  return { selected, selectedMeta };
}
