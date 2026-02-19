import * as cheerio from "cheerio";

const FETCH_TIMEOUT = 30_000;

export async function extractArticleContent(url: string): Promise<string> {
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

    if (!response.ok) return "";

    const html = await response.text();
    return extractMainContent(html);
  } catch (error) {
    console.error(`[Extract] Failed to extract content from ${url}:`, error);
    return "";
  }
}

function extractMainContent(html: string): string {
  const $ = cheerio.load(html);

  // Remove noise elements
  $(
    "script, style, nav, header, footer, aside, iframe, noscript, .sidebar, .comments, .advertisement, .ad, [role=navigation], [role=banner], [role=complementary]"
  ).remove();

  // Try semantic selectors in priority order
  const selectors = ["article", "main", "[role=main]", ".post-content", ".entry-content", ".article-content", ".content"];

  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length) {
      const text = el.text().replace(/\s+/g, " ").trim();
      if (text.length > 100) return text;
    }
  }

  // Fallback: find the largest text block in body
  const body = $("body");
  if (body.length) {
    const text = body.text().replace(/\s+/g, " ").trim();
    if (text.length > 100) return text;
  }

  return "";
}
