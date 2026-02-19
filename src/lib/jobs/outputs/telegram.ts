import { Bot, InputFile } from "grammy";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

export class TelegramChannel {
  private bot: Bot;

  constructor(token?: string) {
    this.bot = new Bot(token || BOT_TOKEN);
  }

  async sendAudio(
    chatId: string,
    audioUrl: string,
    title: string
  ): Promise<void> {
    await this.bot.api.sendAudio(chatId, new InputFile(new URL(audioUrl)), {
      title,
      caption: title,
    });
  }

  async sendLink(
    chatId: string,
    title: string,
    summary: string,
    playbackUrl: string
  ): Promise<void> {
    const text = `🎙 *${escapeMarkdown(title)}*\n\n${escapeMarkdown(summary)}\n\n[Listen now](${playbackUrl})`;
    await this.bot.api.sendMessage(chatId, text, {
      parse_mode: "MarkdownV2",
    });
  }

  async sendBoth(
    chatId: string,
    title: string,
    summary: string,
    playbackUrl: string,
    audioUrl: string
  ): Promise<void> {
    await this.sendLink(chatId, title, summary, playbackUrl);
    await this.sendAudio(chatId, audioUrl, title);
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}
