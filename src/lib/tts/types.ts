export interface TTSProvider {
  synthesize(text: string, voiceId: string): Promise<Buffer>;
  cloneVoice(audioFile: Buffer, name: string): Promise<string>;
  deleteVoice(voiceId: string): Promise<void>;
}

export type TTSErrorCode =
  | "API_ERROR"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "CLONE_FAILED"
  | "SYNTHESIS_FAILED";

export class TTSError extends Error {
  public readonly code: TTSErrorCode;

  constructor(code: TTSErrorCode, message: string) {
    super(message);
    this.name = "TTSError";
    this.code = code;
  }
}
