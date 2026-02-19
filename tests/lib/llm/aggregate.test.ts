import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import { generateAggregatedScript } from "@/lib/llm/aggregate";
import { LLMError } from "@/lib/llm/types";
import type { FetchedArticle } from "@/lib/jobs/sources/types";
import type { AggregationConfig } from "@/lib/llm/aggregate";

const articles: FetchedArticle[] = [
  { title: "Article One", url: "https://a.com/1", content: "Content of article one about AI." },
  { title: "Article Two", url: "https://a.com/2", content: "Content of article two about tech." },
];

const config: AggregationConfig = {
  stylePreset: "casual_chat",
  targetMinutes: 10,
};

const validResponse = {
  title: "Today's Tech Roundup",
  dialogue: [
    { speaker: "A", text: "Welcome to today's episode!" },
    { speaker: "B", text: "We have some great topics to cover." },
    { speaker: "A", text: "Let's start with article one about AI." },
    { speaker: "B", text: "That's a fascinating development." },
  ],
};

function makeMockResponse(content: string) {
  return { content: [{ type: "text", text: content }] };
}

describe("generateAggregatedScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate a script from multiple articles", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse(JSON.stringify(validResponse))
    );

    const result = await generateAggregatedScript(articles, config);
    expect(result.title).toBe("Today's Tech Roundup");
    expect(result.dialogue).toHaveLength(4);
    expect(result.dialogue[0].speaker).toBe("A");
  });

  it("should use the style preset in system prompt", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse(JSON.stringify(validResponse))
    );

    await generateAggregatedScript(articles, {
      ...config,
      stylePreset: "news_brief",
    });

    const call = mockCreate.mock.calls[0][0];
    expect(call.system).toContain("news briefing");
  });

  it("should include custom prompt in system prompt", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse(JSON.stringify(validResponse))
    );

    await generateAggregatedScript(articles, {
      ...config,
      customPrompt: "Always end with a thinking question",
    });

    const call = mockCreate.mock.calls[0][0];
    expect(call.system).toContain("Always end with a thinking question");
  });

  it("should include all articles in user prompt", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse(JSON.stringify(validResponse))
    );

    await generateAggregatedScript(articles, config);

    const call = mockCreate.mock.calls[0][0];
    const userMsg = call.messages[0].content;
    expect(userMsg).toContain("Article One");
    expect(userMsg).toContain("Article Two");
    expect(userMsg).toContain("2 articles");
  });

  it("should include target duration info in user prompt", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse(JSON.stringify(validResponse))
    );

    await generateAggregatedScript(articles, { ...config, targetMinutes: 15 });

    const call = mockCreate.mock.calls[0][0];
    const userMsg = call.messages[0].content;
    expect(userMsg).toContain("15 minutes");
  });

  it("should handle code-fenced JSON response", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse("```json\n" + JSON.stringify(validResponse) + "\n```")
    );

    const result = await generateAggregatedScript(articles, config);
    expect(result.title).toBe("Today's Tech Roundup");
  });

  it("should retry on parse failure up to MAX_PARSE_RETRIES", async () => {
    mockCreate
      .mockResolvedValueOnce(makeMockResponse("not json"))
      .mockResolvedValueOnce(makeMockResponse("still not json"))
      .mockResolvedValueOnce(makeMockResponse("nope"));

    await expect(
      generateAggregatedScript(articles, config)
    ).rejects.toThrow("Failed to parse");

    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it("should throw on invalid dialogue structure", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse(
        JSON.stringify({ title: "Bad", dialogue: [{ speaker: "C", text: "hi" }] })
      )
    );

    await expect(
      generateAggregatedScript(articles, config)
    ).rejects.toThrow("Invalid speaker");
  });

  it("should throw on empty dialogue", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse(JSON.stringify({ title: "Empty", dialogue: [] }))
    );

    await expect(
      generateAggregatedScript(articles, config)
    ).rejects.toThrow("non-empty array");
  });
});
