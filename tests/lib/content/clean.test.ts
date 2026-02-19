import { describe, it, expect } from "vitest";
import {
  stripHtmlTags,
  normalizeWhitespace,
  truncateContent,
  validateContent,
  cleanContent,
  CONTENT_MAX_LENGTH,
  CONTENT_MIN_LENGTH,
} from "@/lib/content/clean";

describe("stripHtmlTags", () => {
  it("removes basic HTML tags and adds space for block elements", () => {
    expect(stripHtmlTags("<p>Hello</p>")).toBe(" Hello ");
    expect(stripHtmlTags("<div><span>World</span> </div>")).toBe(" World  ");
  });

  it("removes script and style tags with content", () => {
    expect(
      stripHtmlTags('<p>Hello</p><script>alert("xss")</script><p>World</p>')
    ).toBe(" Hello  World ");
    expect(
      stripHtmlTags("<p>Hello</p><style>body{color:red}</style><p>World</p>")
    ).toBe(" Hello  World ");
  });

  it("preserves plain text unchanged", () => {
    expect(stripHtmlTags("Hello World")).toBe("Hello World");
    expect(stripHtmlTags("No tags here")).toBe("No tags here");
  });

  it("decodes HTML entities", () => {
    expect(stripHtmlTags("&amp; &lt; &gt; &quot;")).toBe('& < > "');
    expect(stripHtmlTags("&#39;")).toBe("'");
  });
});

describe("normalizeWhitespace", () => {
  it("collapses consecutive spaces to one", () => {
    expect(normalizeWhitespace("hello    world")).toBe("hello world");
    expect(normalizeWhitespace("a  b  c")).toBe("a b c");
  });

  it("collapses more than 2 consecutive newlines to 2", () => {
    expect(normalizeWhitespace("hello\n\n\n\nworld")).toBe("hello\n\nworld");
    expect(normalizeWhitespace("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("preserves up to 2 consecutive newlines", () => {
    expect(normalizeWhitespace("hello\n\nworld")).toBe("hello\n\nworld");
    expect(normalizeWhitespace("hello\nworld")).toBe("hello\nworld");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeWhitespace("  hello  ")).toBe("hello");
    expect(normalizeWhitespace("\n\nhello\n\n")).toBe("hello");
  });
});

describe("truncateContent", () => {
  it("returns original text when under limit", () => {
    const text = "Hello World";
    const result = truncateContent(text);
    expect(result).toEqual({ text: "Hello World", truncated: false });
  });

  it("truncates to CONTENT_MAX_LENGTH by default", () => {
    const text = "a".repeat(CONTENT_MAX_LENGTH + 100);
    const result = truncateContent(text);
    expect(result.text.length).toBe(CONTENT_MAX_LENGTH);
    expect(result.truncated).toBe(true);
  });

  it("truncates to custom limit", () => {
    const text = "a".repeat(200);
    const result = truncateContent(text, 100);
    expect(result.text.length).toBe(100);
    expect(result.truncated).toBe(true);
  });

  it("returns exact length text without truncating", () => {
    const text = "a".repeat(CONTENT_MAX_LENGTH);
    const result = truncateContent(text);
    expect(result.text.length).toBe(CONTENT_MAX_LENGTH);
    expect(result.truncated).toBe(false);
  });
});

describe("validateContent", () => {
  it("returns invalid for empty string", () => {
    const result = validateContent("");
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("returns invalid for whitespace-only string", () => {
    const result = validateContent("   \n\n  ");
    expect(result.valid).toBe(false);
  });

  it("returns invalid for text shorter than minimum", () => {
    const result = validateContent("a".repeat(CONTENT_MIN_LENGTH - 1));
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("returns valid for text at minimum length", () => {
    const result = validateContent("a".repeat(CONTENT_MIN_LENGTH));
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("returns valid for long text", () => {
    const result = validateContent("a".repeat(1000));
    expect(result.valid).toBe(true);
  });
});

describe("cleanContent", () => {
  it("strips HTML, normalizes whitespace, and truncates as pipeline", () => {
    const html = "<p>Hello</p>   <p>World</p>";
    const result = cleanContent(html);
    expect(result.text).toBe("Hello World");
    expect(result.truncated).toBe(false);
  });

  it("handles complex HTML with entities", () => {
    const html =
      '<div><h1>Title</h1><p>Content &amp; more</p><script>bad()</script></div>';
    const result = cleanContent(html);
    expect(result.text).toBe("Title Content & more");
    expect(result.truncated).toBe(false);
  });

  it("truncates long content after cleaning", () => {
    const longText = "<p>" + "a".repeat(CONTENT_MAX_LENGTH + 500) + "</p>";
    const result = cleanContent(longText);
    expect(result.text.length).toBe(CONTENT_MAX_LENGTH);
    expect(result.truncated).toBe(true);
  });
});
