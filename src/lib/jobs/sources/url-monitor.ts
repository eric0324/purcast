import * as cheerio from "cheerio";
import type { FetchedArticle } from "./types";
import { extractArticleContent } from "./extract-content";
import { HARD_LIMITS } from "@/lib/config/plan";

const FETCH_TIMEOUT = 30_000;

export async function fetchURLMonitor(
  pageUrl: string
): Promise<FetchedArticle[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PurCast/1.0; +https://purcast.com)",
        Accept: "text/html",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(
        `[URLMonitor] HTTP ${response.status} for ${pageUrl}`
      );
      return [];
    }

    const html = await response.text();
    const baseUrl = new URL(pageUrl);
    const articleUrls = extractArticleLinks(html, baseUrl);

    const articles: FetchedArticle[] = [];
    for (const url of articleUrls) {
      const content = await extractArticleContent(url);
      if (!content) continue;

      const { title, publishedAt } = await extractPageMeta(url, content);
      articles.push({ title, url, content, publishedAt });
    }

    return articles;
  } catch (error) {
    console.error(`[URLMonitor] Failed to monitor ${pageUrl}:`, error);
    return [];
  }
}

export function extractArticleLinks(html: string, baseUrl: URL): string[] {
  const $ = cheerio.load(html);

  // Remove nav/footer/sidebar noise
  $("nav, header, footer, aside, .sidebar, [role=navigation]").remove();

  const seen = new Set<string>();
  const articleLinks: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const resolved = resolveUrl(href, baseUrl);
    if (!resolved) return;

    // Skip if already seen
    if (seen.has(resolved)) return;
    seen.add(resolved);

    // Must be same domain
    try {
      const linkUrl = new URL(resolved);
      if (linkUrl.hostname !== baseUrl.hostname) return;
    } catch {
      return;
    }

    // Heuristic: looks like an article URL
    if (isArticleLikeUrl(resolved, baseUrl)) {
      articleLinks.push(resolved);
    }
  });

  return articleLinks.slice(0, HARD_LIMITS.urlMonitorMaxLinks);
}

function resolveUrl(href: string, baseUrl: URL): string | null {
  try {
    // Skip anchors, javascript, mailto
    if (
      href.startsWith("#") ||
      href.startsWith("javascript:") ||
      href.startsWith("mailto:")
    ) {
      return null;
    }
    const url = new URL(href, baseUrl.origin);
    // Remove hash and query for dedup
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function isArticleLikeUrl(url: string, baseUrl: URL): boolean {
  const parsedUrl = new URL(url);
  // Use decoded path to handle percent-encoded non-ASCII characters
  const path = decodeURIComponent(parsedUrl.pathname);

  // Skip homepage itself
  if (path === "/" || path === baseUrl.pathname) return false;

  // Skip common non-article paths
  const skipPatterns =
    /^\/(tag|category|categories|author|page|search|about|contact|privacy|terms|login|register|feed|rss|sitemap|wp-admin|wp-login)/i;
  if (skipPatterns.test(path)) return false;

  // Skip file extensions that aren't articles
  if (/\.(xml|json|css|js|png|jpg|gif|svg|pdf|zip)$/i.test(path)) return false;

  // Positive signals: path has date-like segments or slug-like patterns
  const hasDateSegment = /\/\d{4}[/-]\d{2}(\/|$)/.test(path);
  const hasSlug = /\/[^\s/]{3,}\/?$/i.test(path);
  const hasDepth = path.split("/").filter(Boolean).length >= 2;

  return hasDateSegment || (hasSlug && hasDepth);
}

async function extractPageMeta(
  url: string,
  fallbackContent: string
): Promise<{ title: string; publishedAt?: Date }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PurCast/1.0; +https://purcast.com)",
        Accept: "text/html",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { title: fallbackContent.slice(0, 80), publishedAt: extractDateFromUrl(url) };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title =
      $("h1").first().text().trim() ||
      $("title").text().trim() ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      fallbackContent.slice(0, 80);

    // Try to extract published date from meta tags
    const dateStr =
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[property="og:article:published_time"]').attr("content") ||
      $('meta[name="date"]').attr("content") ||
      $('meta[name="pubdate"]').attr("content") ||
      $('time[datetime]').first().attr("datetime") ||
      $('[itemprop="datePublished"]').attr("content") ||
      $('[itemprop="datePublished"]').attr("datetime");

    let publishedAt: Date | undefined;
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) publishedAt = parsed;
    }

    // Fallback: try to extract date from URL slug (e.g. /blog/2026-02-19-...)
    if (!publishedAt) {
      publishedAt = extractDateFromUrl(url);
    }

    return { title, publishedAt };
  } catch {
    return { title: fallbackContent.slice(0, 80), publishedAt: extractDateFromUrl(url) };
  }
}

function extractDateFromUrl(url: string): Date | undefined {
  const path = decodeURIComponent(new URL(url).pathname);
  const match = path.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const parsed = new Date(`${match[1]}-${match[2]}-${match[3]}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
}
