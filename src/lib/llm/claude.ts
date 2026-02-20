import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import type { DialogueScript, GenerateScriptResult, LLMProvider, ScriptOptions } from "./types";
import { LLMError } from "./types";

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 8192;
const MAX_PARSE_RETRIES = 2;
const MAX_TIMEOUT_RETRIES = 1;

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async generateScript(
    content: string,
    options?: ScriptOptions
  ): Promise<GenerateScriptResult> {
    const systemPrompt = buildSystemPrompt(options?.outputLanguage);
    const userPrompt = buildUserPrompt(content, options);
    let parseRetries = 0;
    let timeoutRetries = 0;

    while (true) {
      let response: Anthropic.Message;

      try {
        response = await this.client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });
      } catch (error: unknown) {
        if (this.isRateLimitError(error)) {
          throw new LLMError("RATE_LIMIT", "Rate limit exceeded");
        }

        if (this.isTimeoutError(error)) {
          timeoutRetries++;
          if (timeoutRetries > MAX_TIMEOUT_RETRIES) {
            throw new LLMError("TIMEOUT", "Request timed out after retries");
          }
          continue;
        }

        throw new LLMError(
          "API_ERROR",
          error instanceof Error ? error.message : "Unknown API error"
        );
      }

      const text = this.extractText(response);
      const parsed = this.tryParse(text);

      if (parsed === null) {
        parseRetries++;
        if (parseRetries > MAX_PARSE_RETRIES) {
          throw new LLMError("PARSE_ERROR", "Failed to parse response as JSON after retries");
        }
        continue;
      }

      const result = this.extractResult(parsed);
      this.validateScript(result.dialogue);
      return result;
    }
  }

  private extractText(response: Anthropic.Message): string {
    const block = response.content[0];
    if (block.type === "text") {
      return block.text;
    }
    throw new LLMError("INVALID_RESPONSE", "Unexpected response format");
  }

  private tryParse(text: string): unknown | null {
    try {
      // Strip markdown code fences if present
      const cleaned = text
        .replace(/^```(?:json)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }

  private extractResult(parsed: unknown): GenerateScriptResult {
    // Handle new format: { title, dialogue }
    if (
      parsed &&
      typeof parsed === "object" &&
      "dialogue" in parsed &&
      Array.isArray((parsed as { dialogue: unknown }).dialogue)
    ) {
      const obj = parsed as { title?: string; dialogue: DialogueScript };
      return {
        title: typeof obj.title === "string" ? obj.title : "",
        dialogue: obj.dialogue,
      };
    }

    // Backward compat: plain array (no title)
    if (Array.isArray(parsed)) {
      return { title: "", dialogue: parsed as DialogueScript };
    }

    throw new LLMError("INVALID_RESPONSE", "Expected JSON object with dialogue array");
  }

  private validateScript(script: unknown): asserts script is DialogueScript {
    if (!Array.isArray(script) || script.length === 0) {
      throw new LLMError("INVALID_RESPONSE", "Script must be a non-empty array");
    }

    for (const line of script) {
      if (
        !line ||
        typeof line !== "object" ||
        !("speaker" in line) ||
        !("text" in line)
      ) {
        throw new LLMError("INVALID_RESPONSE", "Invalid dialogue line structure");
      }

      if (line.speaker !== "A" && line.speaker !== "B") {
        throw new LLMError(
          "INVALID_RESPONSE",
          `Invalid speaker: ${line.speaker}`
        );
      }

      if (typeof line.text !== "string" || line.text.length === 0) {
        throw new LLMError("INVALID_RESPONSE", "Dialogue text must be non-empty");
      }
    }
  }

  private isRateLimitError(error: unknown): boolean {
    return (
      error instanceof Error &&
      "status" in error &&
      (error as { status: number }).status === 429
    );
  }

  private isTimeoutError(error: unknown): boolean {
    return (
      error instanceof Error &&
      error.name === "APIConnectionTimeoutError"
    );
  }
}
