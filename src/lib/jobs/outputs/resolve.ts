import { prisma } from "@/lib/db/client";
import { decryptToken } from "./line-token";
import type {
  JobChannelBinding,
  JobOutputConfig,
  TelegramChannelConfig,
} from "../types";

export async function resolveChannels(
  bindings: JobChannelBinding[]
): Promise<JobOutputConfig[]> {
  const valid = bindings.filter((b) => b.channelId);
  if (valid.length === 0) return [];

  const channelIds = valid.map((b) => b.channelId);
  const channels = await prisma.channel.findMany({
    where: { id: { in: channelIds } },
  });

  const channelMap = new Map(channels.map((c) => [c.id, c]));
  const results: JobOutputConfig[] = [];

  for (const binding of valid) {
    const channel = channelMap.get(binding.channelId);
    if (!channel) {
      console.warn(`[resolveChannels] Channel ${binding.channelId} not found, skipping`);
      continue;
    }

    if (channel.type === "telegram") {
      const config = channel.config as unknown as TelegramChannelConfig;
      results.push({
        type: "telegram",
        chatId: config.chatId,
        botToken: config.mode === "custom" ? decryptToken(config.botToken) : undefined,
        format: binding.format,
      });
    }
  }

  return results;
}
