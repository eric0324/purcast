import he from "he";

import { HARD_LIMITS } from "@/lib/config/plan";

export const CONTENT_MAX_LENGTH = HARD_LIMITS.contentMaxLength;
export const CONTENT_MIN_LENGTH = HARD_LIMITS.contentMinLength;

export function stripHtmlTags(html: string): string {
  // Remove script/style tags and their content
  let text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");
  // Add space before block-level closing/opening tags to preserve word boundaries
  text = text.replace(
    /<\/?(?:p|div|h[1-6]|li|br|tr|blockquote|section|article|header|footer|nav|aside|main|figure|figcaption|details|summary|pre|hr)[^>]*>/gi,
    " "
  );
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");
  // Decode HTML entities
  text = he.decode(text);
  return text;
}

export function normalizeWhitespace(text: string): string {
  // Collapse consecutive spaces (not newlines) to one
  let result = text.replace(/[^\S\n]+/g, " ");
  // Collapse 3+ consecutive newlines to 2
  result = result.replace(/\n{3,}/g, "\n\n");
  // Trim leading/trailing whitespace
  result = result.trim();
  return result;
}

export function truncateContent(
  text: string,
  limit: number = CONTENT_MAX_LENGTH
): { text: string; truncated: boolean } {
  if (text.length <= limit) {
    return { text, truncated: false };
  }
  return { text: text.slice(0, limit), truncated: true };
}

export function validateContent(
  text: string
): { valid: boolean; reason?: string } {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: "Content is empty" };
  }
  if (trimmed.length < CONTENT_MIN_LENGTH) {
    return {
      valid: false,
      reason: `Content must be at least ${CONTENT_MIN_LENGTH} characters`,
    };
  }
  return { valid: true };
}

export function cleanContent(
  input: string
): { text: string; truncated: boolean } {
  const stripped = stripHtmlTags(input);
  const normalized = normalizeWhitespace(stripped);
  return truncateContent(normalized);
}
