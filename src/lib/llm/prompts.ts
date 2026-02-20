import type { ScriptOptions } from "./types";

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  "zh-TW":
    "1. Write the title and dialogue in Traditional Chinese using **Taiwanese Mandarin conventions** (台灣用語). " +
    "Do NOT use Mainland Chinese terms — for example use 影片 not 視頻, 軟體 not 軟件, 資訊 not 信息, 網路 not 網絡, 示範 not 演示, 記憶體 not 內存, 滑鼠 not 鼠標, 行動裝置 not 移動設備, 程式 not 程序. " +
    "The source may be in a different language — translate and adapt the content.",
  en: "1. Write the title and dialogue in English. The source may be in a different language — translate and adapt the content.",
};

function buildLanguageRule(outputLanguage?: string): string {
  if (outputLanguage && outputLanguage !== "auto" && LANGUAGE_INSTRUCTIONS[outputLanguage]) {
    return LANGUAGE_INSTRUCTIONS[outputLanguage];
  }
  return "1. Detect the language of the source content and write the title and dialogue in the same language. Do not translate — match the original language exactly. If the source is in Traditional Chinese, use Taiwanese Mandarin conventions (台灣用語), not Mainland Chinese terms.";
}

export function buildSystemPrompt(outputLanguage?: string): string {
  return `You are a podcast script writer. Your job is to transform source content into an engaging two-person dialogue podcast script.

## Roles
- **Host A**: The main host who introduces topics, asks questions, and drives the conversation forward.
- **Host B**: The co-host who provides insights, examples, counterpoints, and adds depth to the discussion.

## Output Format
Return a JSON object with two fields:
- "title": a short, catchy podcast episode title (max 60 characters, same language as the content)
- "dialogue": an array of dialogue lines, each with "speaker" ("A" or "B") and "text" (max 500 characters)

Example:
{
  "title": "The Future of AI in Healthcare",
  "dialogue": [
    {"speaker": "A", "text": "Welcome to today's episode!"},
    {"speaker": "B", "text": "Great to be here. We have a fascinating topic today."}
  ]
}

## Rules
${buildLanguageRule(outputLanguage)}
2. Keep each dialogue line under 500 characters.
3. Make the conversation natural, engaging, and informative.
4. Host A and Host B should alternate frequently, but consecutive lines from the same speaker are allowed when natural.
5. Cover the key points from the source content thoroughly.
6. IMPORTANT — Opening & Closing:
   - Always start with a warm, welcoming opening where hosts greet the audience
     (e.g. "Hey everyone, welcome to today's episode!"). Never jump directly into the topic.
   - Always end with a clear sign-off that wraps up the discussion
     (e.g. "Thanks for tuning in, see you next time!"). Never end abruptly mid-discussion.
7. Return ONLY the JSON object — no markdown, no code fences, no extra text.`;
}

export function buildUserPrompt(
  content: string,
  options?: ScriptOptions
): string {
  const turns = options?.targetTurns ?? 30;

  return `Generate a podcast dialogue script with approximately ${turns} turns based on the following content:

---
${content}
---

Remember: return ONLY a valid JSON object with "title" (string) and "dialogue" (array of {"speaker": "A"|"B", "text": "..."}).`;
}
