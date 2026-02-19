import Parser from "rss-parser";
import type { FetchedArticle } from "./types";
import { extractArticleContent } from "./extract-content";

const parser = new Parser({
  timeout: 30_000,
});

export async function fetchRSS(feedUrl: string): Promise<FetchedArticle[]> {
  try {
    const feed = await parser.parseURL(feedUrl);
    const articles: FetchedArticle[] = [];

    for (const item of feed.items) {
      if (!item.link) continue;

      const inlineContent =
        item["content:encoded"] || item.content || item.contentSnippet || "";

      // If RSS has full inline content (>200 chars), use it directly
      // Otherwise fetch the article page
      let content: string;
      if (inlineContent.length > 200) {
        content = stripHtml(inlineContent);
      } else {
        content = await extractArticleContent(item.link);
      }

      if (!content) continue;

      articles.push({
        title: item.title || "Untitled",
        url: item.link,
        content,
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      });
    }

    return articles;
  } catch (error) {
    console.error(`[RSS] Failed to fetch feed ${feedUrl}:`, error);
    return [];
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
