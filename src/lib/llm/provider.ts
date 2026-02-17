import type { LLMProvider } from "./types";
import { ClaudeProvider } from "./claude";

export function createLLMProvider(): LLMProvider {
  return new ClaudeProvider();
}
