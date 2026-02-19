import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  generateVerificationCode,
  getVerifiedChatId,
} from "@/lib/jobs/outputs/telegram-verify";

// POST: Generate a verification code for the authenticated user
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = generateVerificationCode(user.id);
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "PurCastBot";

  return NextResponse.json({
    code,
    botLink: `https://t.me/${botUsername}`,
    expiresInSeconds: 600,
  });
}

// GET: Poll for verification result (chatId)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chatId = getVerifiedChatId(user.id);

  if (chatId) {
    return NextResponse.json({ verified: true, chatId });
  }

  return NextResponse.json({ verified: false });
}
