import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { getVerifiedChatId } from "@/lib/jobs/outputs/telegram-verify";
import { encryptToken } from "@/lib/jobs/outputs/line-token";
import type { TelegramChannelConfig } from "@/lib/jobs/types";

// GET: List user's channels
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channels = await prisma.channel.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  // Sanitize: never expose raw tokens to the client
  const sanitized = channels.map((ch) => ({
    id: ch.id,
    name: ch.name,
    type: ch.type,
    config: sanitizeConfig(ch.config as Record<string, unknown>),
    createdAt: ch.createdAt.toISOString(),
    updatedAt: ch.updatedAt.toISOString(),
  }));

  return NextResponse.json({ channels: sanitized });
}

function sanitizeConfig(config: Record<string, unknown>) {
  const tc = config as unknown as TelegramChannelConfig;
  return {
    mode: tc.mode,
    chatId: tc.chatId,
  };
}

// POST: Create a new channel
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, type, mode, botToken, chatId } = body;

  if (!name || !type) {
    return NextResponse.json(
      { errorKey: "channels.nameAndTypeRequired" },
      { status: 400 }
    );
  }

  if (type !== "telegram") {
    return NextResponse.json(
      { errorKey: "channels.invalidType" },
      { status: 400 }
    );
  }

  let config: TelegramChannelConfig;

  if (mode === "official") {
    // Use verified chatId from in-memory store, or fall back to client-provided chatId
    // (polling endpoint already verified the chatId before returning it to the client)
    const officialChatId = getVerifiedChatId(user.id) || chatId;
    if (!officialChatId) {
      return NextResponse.json(
        { errorKey: "channels.telegramNotVerified" },
        { status: 400 }
      );
    }
    config = { mode: "official", chatId: officialChatId };
  } else if (mode === "custom") {
    if (!botToken || !chatId) {
      return NextResponse.json(
        { errorKey: "channels.customBotFieldsRequired" },
        { status: 400 }
      );
    }
    config = {
      mode: "custom",
      botToken: encryptToken(botToken),
      chatId,
    };
  } else {
    return NextResponse.json(
      { errorKey: "channels.invalidTelegramMode" },
      { status: 400 }
    );
  }

  const channel = await prisma.channel.create({
    data: {
      userId: user.id,
      name,
      type,
      config: JSON.parse(JSON.stringify(config)),
    },
  });

  return NextResponse.json({ channel: { id: channel.id, name: channel.name, type: channel.type } }, { status: 201 });
}
