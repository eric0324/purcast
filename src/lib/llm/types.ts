export interface DialogueLine {
  speaker: "A" | "B";
  text: string;
}

export type DialogueScript = DialogueLine[];

export interface GenerateScriptResult {
  title: string;
  dialogue: DialogueScript;
}

export interface ScriptOptions {
  targetTurns?: number;
  maxCharsPerLine?: number;
}

export interface LLMProvider {
  generateScript(
    content: string,
    options?: ScriptOptions
  ): Promise<GenerateScriptResult>;
}

export type LLMErrorCode =
  | "API_ERROR"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "INVALID_RESPONSE"
  | "PARSE_ERROR";

export class LLMError extends Error {
  public readonly code: LLMErrorCode;

  constructor(code: LLMErrorCode, message: string) {
    super(message);
    this.name = "LLMError";
    this.code = code;
  }
}
