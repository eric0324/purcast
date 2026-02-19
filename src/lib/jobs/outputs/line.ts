import crypto from "crypto";

export class LineChannel {
  private channelAccessToken: string;

  constructor(channelAccessToken: string) {
    this.channelAccessToken = channelAccessToken;
  }

  async sendAudio(
    userIds: string[],
    audioUrl: string,
    durationMs: number,
    title: string
  ): Promise<void> {
    await this.pushMessage(userIds, [
      {
        type: "audio",
        originalContentUrl: audioUrl,
        duration: durationMs,
      },
    ]);
    // LINE audio messages don't support titles, send a text message too
    await this.pushMessage(userIds, [
      {
        type: "text",
        text: `🎙 ${title}`,
      },
    ]);
  }

  async sendLink(
    userIds: string[],
    title: string,
    summary: string,
    playbackUrl: string
  ): Promise<void> {
    await this.pushMessage(userIds, [
      {
        type: "text",
        text: `🎙 ${title}\n\n${summary}\n\n🔗 ${playbackUrl}`,
      },
    ]);
  }

  async sendBoth(
    userIds: string[],
    title: string,
    summary: string,
    playbackUrl: string,
    audioUrl: string,
    durationMs: number
  ): Promise<void> {
    await this.sendLink(userIds, title, summary, playbackUrl);
    await this.pushMessage(userIds, [
      {
        type: "audio",
        originalContentUrl: audioUrl,
        duration: durationMs,
      },
    ]);
  }

  private async pushMessage(
    userIds: string[],
    messages: LineMessage[]
  ): Promise<void> {
    // LINE Messaging API: multicast to multiple users
    const res = await fetch("https://api.line.me/v2/bot/message/multicast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.channelAccessToken}`,
      },
      body: JSON.stringify({
        to: userIds,
        messages,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new LineApiError(
        `LINE API error: ${res.status} ${body}`,
        res.status
      );
    }
  }
}

export class LineApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "LineApiError";
    this.statusCode = statusCode;
  }
}

// Verify LINE webhook signature
export function verifyLineSignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

interface LineMessage {
  type: string;
  text?: string;
  originalContentUrl?: string;
  duration?: number;
}
