import { webExtractor } from "./web";
import type { ContentExtractor } from "./types";

// 新 extractor 加入此陣列即可，順序 = 優先級
const extractors: ContentExtractor[] = [
  // 未來: rssExtractor, twitterExtractor,
  webExtractor, // fallback：所有 http/https URL
];

export function getExtractor(url: string): ContentExtractor | null {
  return extractors.find((e) => e.canHandle(url)) ?? null;
}
