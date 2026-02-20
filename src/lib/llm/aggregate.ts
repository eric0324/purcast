import Anthropic from "@anthropic-ai/sdk";
import type { FetchedArticle } from "@/lib/jobs/sources/types";
import type { GenerateScriptResult, DialogueScript } from "./types";
import { LLMError } from "./types";
import { STYLE_PRESETS } from "./style-presets";
import type { StylePreset } from "@/lib/jobs/types";

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 8192;
const MAX_PARSE_RETRIES = 2;

// ~150 words per minute for conversational speech
const WORDS_PER_MINUTE = 150;

export interface AggregationConfig {
  stylePreset: StylePreset;
  customPrompt?: string;
  targetMinutes: number;
  outputLanguage?: string;
}

export async function generateAggregatedScript(
  articles: FetchedArticle[],
  config: AggregationConfig
): Promise<GenerateScriptResult> {
  const client = new Anthropic();

  const systemPrompt = buildAggregateSystemPrompt(config);
  const userPrompt = buildAggregateUserPrompt(articles, config);

  let parseRetries = 0;

  while (true) {
    let response: Anthropic.Message;

    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "status" in error &&
        (error as { status: number }).status === 429
      ) {
        throw new LLMError("RATE_LIMIT", "Rate limit exceeded");
      }
      throw new LLMError(
        "API_ERROR",
        error instanceof Error ? error.message : "Unknown API error"
      );
    }

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const cleaned = text
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parseRetries++;
      if (parseRetries > MAX_PARSE_RETRIES) {
        throw new LLMError(
          "PARSE_ERROR",
          "Failed to parse aggregated script as JSON after retries"
        );
      }
      continue;
    }

    const result = extractResult(parsed);
    validateScript(result.dialogue);
    return result;
  }
}

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  "zh-TW":
    "1. Write the title and dialogue in Traditional Chinese using **Taiwanese Mandarin conventions** (台灣用語). " +
    "Do NOT use Mainland Chinese terms — for example use 影片 not 視頻, 軟體 not 軟件, 資訊 not 信息, 網路 not 網絡, 示範 not 演示, 記憶體 not 內存, 滑鼠 not 鼠標, 行動裝置 not 移動設備, 程式 not 程序. " +
    "The source may be in a different language — translate and adapt the content.",
  en: "1. Write the title and dialogue in English. The source may be in a different language — translate and adapt the content.",
};

function buildAggregateSystemPrompt(config: AggregationConfig): string {
  const stylePrompt =
    STYLE_PRESETS[config.stylePreset] || STYLE_PRESETS.casual_chat;

  const langRule =
    config.outputLanguage &&
    config.outputLanguage !== "auto" &&
    LANGUAGE_INSTRUCTIONS[config.outputLanguage]
      ? LANGUAGE_INSTRUCTIONS[config.outputLanguage]
      : "1. Detect the language of the source articles and write in the same language. If the source is in Traditional Chinese, use Taiwanese Mandarin conventions (台灣用語), not Mainland Chinese terms.";

  let prompt = `You are a podcast script writer creating an aggregated episode from multiple articles.

${stylePrompt}

## Output Format
Return a JSON object with two fields:
- "title": a short, catchy podcast episode title (max 60 characters, same language as the content)
- "dialogue": an array of dialogue lines, each with "speaker" ("A" or "B") and "text" (max 500 characters)

## Rules
${langRule}
2. Cover ALL provided articles, creating smooth transitions between topics.
3. IMPORTANT — Opening & Closing:
   - Always start with a warm opening where hosts greet the audience and give a brief overview
     of today's topics. Never jump directly into the first article.
   - Always end with a clear sign-off (e.g. "That's all for today! Thanks for listening.").
     Never end abruptly.
4. Keep each dialogue line under 500 characters.
5. Return ONLY the JSON object — no markdown, no code fences, no extra text.`;

  if (config.customPrompt) {
    prompt += `\n\n## Additional Instructions\n${config.customPrompt}`;
  }

  return prompt;
}

function buildAggregateUserPrompt(
  articles: FetchedArticle[],
  config: AggregationConfig
): string {
  const targetWords = config.targetMinutes * WORDS_PER_MINUTE;
  const targetTurns = Math.round(config.targetMinutes * 4); // ~4 turns per minute

  const articleBlocks = articles
    .map(
      (a, i) =>
        `### Article ${i + 1}: ${a.title}\nSource: ${a.url}\n\n${a.content.slice(0, 3000)}`
    )
    .join("\n\n---\n\n");

  return `Generate a podcast dialogue script of approximately ${targetTurns} turns (~${targetWords} words, ~${config.targetMinutes} minutes) covering the following ${articles.length} articles:

${articleBlocks}

Remember: return ONLY a valid JSON object with "title" (string) and "dialogue" (array of {"speaker": "A"|"B", "text": "..."}).`;
}

function extractResult(parsed: unknown): GenerateScriptResult {
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

  if (Array.isArray(parsed)) {
    return { title: "", dialogue: parsed as DialogueScript };
  }

  throw new LLMError(
    "INVALID_RESPONSE",
    "Expected JSON object with dialogue array"
  );
}

function validateScript(script: unknown): asserts script is DialogueScript {
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
      throw new LLMError(
        "INVALID_RESPONSE",
        "Invalid dialogue line structure"
      );
    }
    if (line.speaker !== "A" && line.speaker !== "B") {
      throw new LLMError(
        "INVALID_RESPONSE",
        `Invalid speaker: ${line.speaker}`
      );
    }
    if (typeof line.text !== "string" || line.text.length === 0) {
      throw new LLMError(
        "INVALID_RESPONSE",
        "Dialogue text must be non-empty"
      );
    }
  }
}
