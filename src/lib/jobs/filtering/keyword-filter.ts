import type { FetchedArticle } from "../sources/types";

export function keywordFilter(
  articles: FetchedArticle[],
  includeKeywords?: string[],
  excludeKeywords?: string[]
): FetchedArticle[] {
  let result = articles;

  if (includeKeywords && includeKeywords.length > 0) {
    const patterns = includeKeywords.map((k) => k.toLowerCase());
    result = result.filter((article) => {
      const text = `${article.title} ${article.content}`.toLowerCase();
      return patterns.some((keyword) => text.includes(keyword));
    });
  }

  if (excludeKeywords && excludeKeywords.length > 0) {
    const patterns = excludeKeywords.map((k) => k.toLowerCase());
    result = result.filter((article) => {
      const text = `${article.title} ${article.content}`.toLowerCase();
      return !patterns.some((keyword) => text.includes(keyword));
    });
  }

  return result;
}
