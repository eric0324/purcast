import { NextRequest, NextResponse } from "next/server";
import { verifyCode, storeVerifiedChatId } from "@/lib/jobs/outputs/telegram-verify";
import { prisma } from "@/lib/db/client";

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret token
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
    const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
    if (webhookSecret && secretHeader !== webhookSecret) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const update = await request.json();

    // Only handle text messages
    const message = update?.message;
    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // Check if text matches 6-digit verification code pattern
    if (/^\d{6}$/.test(text)) {
      const result = verifyCode(text);

      if (result) {
        // Store chatId so the frontend can poll and retrieve it
        storeVerifiedChatId(result.userId, chatId);

        // Send confirmation via Telegram Bot API
        if (botToken) {
          await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: "✅ 綁定成功！你將在此接收 Podcast 通知。\n\nBinding successful! You will receive podcast notifications here.",
              }),
            }
          );
        }

        return NextResponse.json({ ok: true });
      }

      // Check if this chat is already bound to a channel
      if (botToken) {
        const existingChannel = await prisma.channel.findFirst({
          where: {
            type: "telegram",
            config: { path: ["chatId"], equals: chatId },
          },
        });

        if (existingChannel) {
          await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: "✅ 此聊天室已綁定 PurCast，無需重複驗證。\n\nThis chat is already linked to PurCast. No need to verify again.",
              }),
            }
          );
        } else {
          await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: "❌ 驗證碼無效或已過期，請重新產生。\n\nInvalid or expired code. Please generate a new one.",
              }),
            }
          );
        }
      }

      return NextResponse.json({ ok: true });
    }

    // Non-code message: send help
    if (botToken) {
      await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "👋 歡迎使用 PurCast Bot！\n\n請在 PurCast 網站的 Job 設定頁面產生驗證碼，然後在此輸入 6 位數字完成綁定。\n\nWelcome to PurCast Bot! Generate a verification code on the PurCast website and send the 6-digit code here to bind.",
          }),
        }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telegram Webhook] Error:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}
