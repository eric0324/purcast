import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import { aiFilterArticles } from "@/lib/llm/filter";
import { LLMError } from "@/lib/llm/types";
import type { FetchedArticle } from "@/lib/jobs/sources/types";

const articles: FetchedArticle[] = [
  { title: "AI Product Launch", url: "https://a.com/1", content: "New AI product for enterprise use" },
  { title: "JavaScript Framework", url: "https://a.com/2", content: "A new JS framework released today" },
  { title: "LLM Research Paper", url: "https://a.com/3", content: "Academic paper about transformers" },
];

function makeMockResponse(content: string) {
  return { content: [{ type: "text", text: content }] };
}

describe("aiFilterArticles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return ranked articles with reasons", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse(
        JSON.stringify([
          { url: "https://a.com/1", reason: "Directly about AI products" },
          { url: "https://a.com/3", reason: "Related to LLM technology" },
        ])
      )
    );

    const result = await aiFilterArticles(articles, "I care about AI", 5);
    expect(result).toHaveLength(2);
    expect(result[0].url).toBe("https://a.com/1");
    expect(result[0].reason).toBe("Directly about AI products");
    expect(result[1].url).toBe("https://a.com/3");
  });

  it("should limit results to maxArticles", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse(
        JSON.stringify([
          { url: "https://a.com/1", reason: "Reason 1" },
          { url: "https://a.com/2", reason: "Reason 2" },
          { url: "https://a.com/3", reason: "Reason 3" },
        ])
      )
    );

    const result = await aiFilterArticles(articles, "Everything", 2);
    expect(result).toHaveLength(2);
  });

  it("should filter out URLs not in the original articles", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse(
        JSON.stringify([
          { url: "https://a.com/1", reason: "Valid" },
          { url: "https://unknown.com/fake", reason: "Hallucinated URL" },
        ])
      )
    );

    const result = await aiFilterArticles(articles, "AI", 5);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://a.com/1");
  });

  it("should handle JSON wrapped in code fences", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse(
        '```json\n[{"url": "https://a.com/1", "reason": "Good match"}]\n```'
      )
    );

    const result = await aiFilterArticles(articles, "AI", 5);
    expect(result).toHaveLength(1);
  });

  it("should throw LLMError on non-array response", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse('{"not": "an array"}')
    );

    await expect(aiFilterArticles(articles, "AI", 5)).rejects.toThrow(LLMError);
  });

  it("should throw LLMError on API error", async () => {
    mockCreate.mockRejectedValue(new Error("Connection failed"));

    await expect(aiFilterArticles(articles, "AI", 5)).rejects.toThrow(LLMError);
  });

  it("should throw rate limit error", async () => {
    const error = new Error("Rate limited");
    Object.assign(error, { status: 429 });
    mockCreate.mockRejectedValue(error);

    await expect(aiFilterArticles(articles, "AI", 5)).rejects.toThrow("Rate limit exceeded");
  });
});
