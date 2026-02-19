export interface JobSource {
  type: "rss" | "url";
  url: string;
  label?: string;
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
  voiceId?: string;
  maxArticles: number; // default 5
  targetMinutes: number; // default 15
}

export type OutputFormat = "audio" | "link" | "both";

export interface TelegramOutputConfig {
  type: "telegram";
  chatId: string;
  format: OutputFormat;
}

export interface LineOutputConfig {
  type: "line";
  channelAccessToken: string;
  lineUserIds: string[];
  format: OutputFormat;
}

export type JobOutputConfig = TelegramOutputConfig | LineOutputConfig;

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
