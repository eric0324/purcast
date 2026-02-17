import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import he from "he";
import { cleanContent } from "../clean";
import type { ContentExtractor, ExtractResult } from "./types";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2MB

export type ExtractErrorCode =
  | "TIMEOUT"
  | "HTML_TOO_LARGE"
  | "FETCH_FAILED"
  | "PARSE_FAILED";

export class ExtractError extends Error {
  constructor(
    public code: ExtractErrorCode,
    message?: string
  ) {
    super(message ?? code);
    this.name = "ExtractError";
  }
}

export const webExtractor: ContentExtractor = {
  canHandle(url: string): boolean {
    return /^https?:\/\//.test(url);
  },

  async extract(url: string): Promise<ExtractResult> {
    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Podify/1.0; +https://podify.app)",
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        throw new ExtractError("TIMEOUT", `Request timed out for ${url}`);
      }
      if (err instanceof TypeError && (err as NodeJS.ErrnoException).code === "ABORT_ERR") {
        throw new ExtractError("TIMEOUT", `Request timed out for ${url}`);
      }
      throw new ExtractError("FETCH_FAILED", `Failed to fetch ${url}`);
    }

    if (!response.ok) {
      throw new ExtractError(
        "FETCH_FAILED",
        `HTTP ${response.status} for ${url}`
      );
    }

    // Check content-length header first
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_HTML_BYTES) {
      throw new ExtractError(
        "HTML_TOO_LARGE",
        `HTML exceeds ${MAX_HTML_BYTES} bytes`
      );
    }

    const html = await response.text();
    if (html.length > MAX_HTML_BYTES) {
      throw new ExtractError(
        "HTML_TOO_LARGE",
        `HTML exceeds ${MAX_HTML_BYTES} bytes`
      );
    }

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      throw new ExtractError("PARSE_FAILED", `Could not parse content from ${url}`);
    }

    const decoded = he.decode(article.textContent);
    const { text, truncated } = cleanContent(decoded);

    return {
      title: article.title || "",
      content: text,
      sourceUrl: url,
      truncated,
    };
  },
};
