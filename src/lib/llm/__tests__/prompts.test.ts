import { describe, it, expect } from "vitest";
import { SYSTEM_PROMPT, buildUserPrompt } from "../prompts";

describe("SYSTEM_PROMPT", () => {
  it("contains Host A and Host B role definitions", () => {
    expect(SYSTEM_PROMPT).toContain("Host A");
    expect(SYSTEM_PROMPT).toContain("Host B");
  });

  it("specifies JSON output format", () => {
    expect(SYSTEM_PROMPT).toContain("JSON");
    expect(SYSTEM_PROMPT).toContain('"speaker"');
    expect(SYSTEM_PROMPT).toContain('"text"');
  });

  it("includes auto language detection instruction", () => {
    expect(SYSTEM_PROMPT).toMatch(/language/i);
    expect(SYSTEM_PROMPT).toMatch(/detect|same language|match/i);
  });

  it("includes character limit instruction (500)", () => {
    expect(SYSTEM_PROMPT).toContain("500");
  });
});

describe("buildUserPrompt", () => {
  it("includes the source content", () => {
    const prompt = buildUserPrompt("This is the article content.");
    expect(prompt).toContain("This is the article content.");
  });

  it("defaults to 30 turns", () => {
    const prompt = buildUserPrompt("content");
    expect(prompt).toContain("30");
  });

  it("allows custom targetTurns", () => {
    const prompt = buildUserPrompt("content", { targetTurns: 20 });
    expect(prompt).toContain("20");
    expect(prompt).not.toMatch(/\b30\b/);
  });
});
