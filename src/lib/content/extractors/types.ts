export interface ExtractResult {
  title: string;
  content: string;
  sourceUrl: string;
  truncated: boolean;
}

export interface ContentExtractor {
  canHandle(url: string): boolean;
  extract(url: string): Promise<ExtractResult>;
}
