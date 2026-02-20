export type RedditSort = "hot" | "top_day" | "top_week" | "top_month" | "new";

export interface JobSource {
  type: "rss" | "url" | "reddit";
  url: string;
  label?: string;
  subreddit?: string;
  sort?: RedditSort;
  includeComments?: boolean;
}

export interface JobSchedule {
  mode: "daily" | "weekly";
  time: string; // 'HH:mm'
  timezone: string; // e.g. 'Asia/Taipei'
  weekday?: number; // 0=Sunday, 1=Monday, ... 6=Saturday (for weekly mode)
}

export interface JobFilterConfig {
  includeKeywords?: string[];
  excludeKeywords?: string[];
  aiPrompt?: string;
}

export type StylePreset =
  | "news_brief"
  | "casual_chat"
  | "deep_analysis"
  | "talk_show";

export interface JobGenerationConfig {
  stylePreset: StylePreset;
  customPrompt?: string;
  voices?: Record<string, string>; // speaker → voiceId, e.g. { A: "xxx", B: "yyy" }
  maxArticles: number; // default 5
  targetMinutes: number; // default 15
  outputLanguage?: string; // "auto" | "zh-TW" | "en"
}

export type OutputFormat = "audio" | "link" | "both";

export interface TelegramOutputConfig {
  type: "telegram";
  chatId: string;
  botToken?: string;
  format: OutputFormat;
}

export type JobOutputConfig = TelegramOutputConfig;

// Channel-based binding (stored in Job.outputConfig)
export interface JobChannelBinding {
  channelId: string;
  format: OutputFormat;
}

// Channel config JSON structures (stored in Channel.config)
export interface TelegramOfficialChannelConfig {
  mode: "official";
  chatId: string;
}

export interface TelegramCustomChannelConfig {
  mode: "custom";
  botToken: string; // encrypted
  chatId: string;
}

export type TelegramChannelConfig =
  | TelegramOfficialChannelConfig
  | TelegramCustomChannelConfig;

export interface SelectedArticle {
  title: string;
  url: string;
  reason: string;
}

export type JobStatus = "active" | "paused" | "error";

export type JobRunStatus =
  | "pending"
  | "fetching"
  | "filtering"
  | "generating_script"
  | "generating_audio"
  | "publishing"
  | "completed"
  | "failed"
  | "skipped";
