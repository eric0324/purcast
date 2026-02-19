import { TelegramChannel } from "./telegram";
import { LineChannel } from "./line";
import { decryptToken } from "./line-token";
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
        const telegram = new TelegramChannel();

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
      } else if (config.type === "line") {
        if (config.lineUserIds.length === 0) {
          results.push({
            type: "line",
            success: false,
            error: "No LINE users to send to",
          });
          continue;
        }

        let accessToken: string;
        try {
          accessToken = decryptToken(config.channelAccessToken);
        } catch {
          accessToken = config.channelAccessToken; // Fallback: plain token
        }

        const line = new LineChannel(accessToken);

        if (config.format === "audio") {
          await line.sendAudio(
            config.lineUserIds,
            podcast.audioUrl,
            podcast.durationMs,
            podcast.title
          );
        } else if (config.format === "link") {
          await line.sendLink(
            config.lineUserIds,
            podcast.title,
            podcast.summary,
            podcast.playbackUrl
          );
        } else {
          await line.sendBoth(
            config.lineUserIds,
            podcast.title,
            podcast.summary,
            podcast.playbackUrl,
            podcast.audioUrl,
            podcast.durationMs
          );
        }

        results.push({ type: "line", success: true });
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
