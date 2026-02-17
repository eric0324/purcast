import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import { ClaudeProvider } from "../claude";
import { LLMError } from "../types";

const validDialogue = [
  { speaker: "A", text: "Welcome!" },
  { speaker: "B", text: "Great to be here." },
];

const validResponse = {
  title: "Test Episode",
  dialogue: validDialogue,
};

function makeMockResponse(content: string) {
  return {
    content: [{ type: "text", text: content }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ClaudeProvider", () => {
  it("calls Claude API with correct model and system prompt", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse(JSON.stringify(validResponse))
    );

    const provider = new ClaudeProvider();
    await provider.generateScript("test content");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-5-20250929",
        system: expect.stringContaining("Host A"),
        max_tokens: 8192,
      })
    );
  });

  it("returns parsed DialogueScript on success", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse(JSON.stringify(validResponse))
    );

    const provider = new ClaudeProvider();
    const result = await provider.generateScript("test content");

    expect(result).toEqual({ title: "Test Episode", dialogue: validDialogue });
  });

  it("retries up to 2 times on JSON parse failure", async () => {
    mockCreate
      .mockResolvedValueOnce(makeMockResponse("not json"))
      .mockResolvedValueOnce(makeMockResponse("still not json"))
      .mockResolvedValueOnce(
        makeMockResponse(JSON.stringify(validResponse))
      );

    const provider = new ClaudeProvider();
    const result = await provider.generateScript("test content");

    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ title: "Test Episode", dialogue: validDialogue });
  });

  it("throws PARSE_ERROR after 3rd parse failure", async () => {
    mockCreate
      .mockResolvedValueOnce(makeMockResponse("bad"))
      .mockResolvedValueOnce(makeMockResponse("bad"))
      .mockResolvedValueOnce(makeMockResponse("bad"));

    const provider = new ClaudeProvider();

    const error = await provider
      .generateScript("test")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LLMError);
    expect((error as LLMError).code).toBe("PARSE_ERROR");
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it("retries once on timeout", async () => {
    const timeoutError = new Error("Request timed out");
    timeoutError.name = "APIConnectionTimeoutError";

    mockCreate
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce(
        makeMockResponse(JSON.stringify(validResponse))
      );

    const provider = new ClaudeProvider();
    const result = await provider.generateScript("test content");

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ title: "Test Episode", dialogue: validDialogue });
  });

  it("throws TIMEOUT after 2nd timeout", async () => {
    const timeoutError = new Error("Request timed out");
    timeoutError.name = "APIConnectionTimeoutError";

    mockCreate
      .mockRejectedValueOnce(timeoutError)
      .mockRejectedValueOnce(timeoutError);

    const provider = new ClaudeProvider();

    const error = await provider
      .generateScript("test")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LLMError);
    expect((error as LLMError).code).toBe("TIMEOUT");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("throws RATE_LIMIT immediately without retry", async () => {
    const rateLimitError = Object.assign(new Error("Rate limited"), {
      status: 429,
    });

    mockCreate.mockRejectedValue(rateLimitError);

    const provider = new ClaudeProvider();

    const error = await provider
      .generateScript("test")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LLMError);
    expect((error as LLMError).code).toBe("RATE_LIMIT");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("throws INVALID_RESPONSE for empty dialogue array", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse(JSON.stringify({ title: "Test", dialogue: [] }))
    );

    const provider = new ClaudeProvider();

    const error = await provider
      .generateScript("test")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LLMError);
    expect((error as LLMError).code).toBe("INVALID_RESPONSE");
  });

  it("handles backward-compat plain array response", async () => {
    mockCreate.mockResolvedValue(
      makeMockResponse(JSON.stringify(validDialogue))
    );

    const provider = new ClaudeProvider();
    const result = await provider.generateScript("test content");

    expect(result.title).toBe("");
    expect(result.dialogue).toEqual(validDialogue);
  });

  it("throws INVALID_RESPONSE for invalid speaker value", async () => {
    const badScript = {
      title: "Test",
      dialogue: [
        { speaker: "C", text: "Hello" },
        { speaker: "A", text: "Hi" },
      ],
    };
    mockCreate.mockResolvedValue(
      makeMockResponse(JSON.stringify(badScript))
    );

    const provider = new ClaudeProvider();

    const error = await provider
      .generateScript("test")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LLMError);
    expect((error as LLMError).code).toBe("INVALID_RESPONSE");
  });
});
