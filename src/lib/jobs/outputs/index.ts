import { TelegramChannel } from "./telegram";
import type { JobOutputConfig } from "../types";

export interface PodcastInfo {
  title: string;
  summary: string;
  playbackUrl: string;
  audioUrl: string;
  durationMs: number;
}

export interface ChannelResult {
  type: string;
  success: boolean;
  error?: string;
}

export async function publishToChannels(
  outputConfigs: JobOutputConfig[],
  podcast: PodcastInfo
): Promise<ChannelResult[]> {
  const results: ChannelResult[] = [];

  for (const config of outputConfigs) {
    try {
      if (config.type === "telegram") {
        const telegram = new TelegramChannel(config.botToken);

        if (config.format === "audio") {
          await telegram.sendAudio(config.chatId, podcast.audioUrl, podcast.title);
        } else if (config.format === "link") {
          await telegram.sendLink(
            config.chatId,
            podcast.title,
            podcast.summary,
            podcast.playbackUrl
          );
        } else {
          await telegram.sendBoth(
            config.chatId,
            podcast.title,
            podcast.summary,
            podcast.playbackUrl,
            podcast.audioUrl
          );
        }

        results.push({ type: "telegram", success: true });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[Output] ${config.type} delivery failed:`, message);
      results.push({ type: config.type, success: false, error: message });
    }
  }

  return results;
}
