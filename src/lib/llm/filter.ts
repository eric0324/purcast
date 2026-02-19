import Anthropic from "@anthropic-ai/sdk";
import type { FetchedArticle } from "@/lib/jobs/sources/types";
import { LLMError } from "./types";

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 2048;

export interface AIFilteredArticle {
  url: string;
  reason: string;
}

const FILTER_SYSTEM_PROMPT = `You are a content curator. Given a list of articles and a user's interest description, select the most relevant articles and rank them by relevance.

Respond with a JSON array of selected articles. Each entry must have:
- "url": the article URL (must match exactly from the input)
- "reason": a brief explanation (1 sentence) of why this article was selected

Only include articles that match the user's interests. Return fewer articles if few are relevant.
Respond ONLY with the JSON array, no other text.`;

export async function aiFilterArticles(
  articles: FetchedArticle[],
  aiPrompt: string,
  maxArticles: number
): Promise<AIFilteredArticle[]> {
  const client = new Anthropic();

  const articleSummaries = articles.map((a, i) => {
    const summary = a.content.slice(0, 200);
    return `[${i + 1}] Title: ${a.title}\n    URL: ${a.url}\n    Summary: ${summary}`;
  });

  const userPrompt = `User's interests: ${aiPrompt}

Select up to ${maxArticles} most relevant articles from the following list:

${articleSummaries.join("\n\n")}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: FILTER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const cleaned = text
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new LLMError("PARSE_ERROR", "AI filter response is not an array");
    }

    // Validate and limit results
    const validUrls = new Set(articles.map((a) => a.url));
    const results: AIFilteredArticle[] = [];

    for (const item of parsed) {
      if (results.length >= maxArticles) break;
      if (
        item &&
        typeof item.url === "string" &&
        typeof item.reason === "string" &&
        validUrls.has(item.url)
      ) {
        results.push({ url: item.url, reason: item.reason });
      }
    }

    return results;
  } catch (error) {
    if (error instanceof LLMError) throw error;
    if (
      error instanceof Error &&
      "status" in error &&
      (error as { status: number }).status === 429
    ) {
      throw new LLMError("RATE_LIMIT", "Rate limit exceeded");
    }
    throw new LLMError(
      "API_ERROR",
      error instanceof Error ? error.message : "AI filter failed"
    );
  }
}
