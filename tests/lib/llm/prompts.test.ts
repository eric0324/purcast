import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/llm/prompts";

describe("buildSystemPrompt", () => {
  it("contains Host A and Host B role definitions", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Host A");
    expect(prompt).toContain("Host B");
  });

  it("specifies JSON output format", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("JSON");
    expect(prompt).toContain('"speaker"');
    expect(prompt).toContain('"text"');
  });

  it("includes auto language detection when no outputLanguage is set", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/detect/i);
    expect(prompt).toMatch(/same language|match the original language/i);
  });

  it("includes auto language detection for 'auto'", () => {
    const prompt = buildSystemPrompt("auto");
    expect(prompt).toMatch(/detect/i);
  });

  it("uses specified language for zh-TW", () => {
    const prompt = buildSystemPrompt("zh-TW");
    expect(prompt).toContain("Traditional Chinese");
    expect(prompt).toContain("translate and adapt");
    expect(prompt).not.toMatch(/detect the language/i);
  });

  it("uses specified language for en", () => {
    const prompt = buildSystemPrompt("en");
    expect(prompt).toContain("English");
    expect(prompt).toContain("translate and adapt");
  });

  it("includes character limit instruction (500)", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("500");
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
