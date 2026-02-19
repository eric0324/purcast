import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DialogueScript } from "@/lib/llm/types";
import type { TTSProvider } from "@/lib/tts/types";
import { TTSError } from "@/lib/tts/types";
import { synthesizeScript } from "@/lib/tts/synthesize-script";

function createMockProvider(): TTSProvider {
  return {
    synthesize: vi.fn(),
    cloneVoice: vi.fn(),
    deleteVoice: vi.fn(),
  };
}

const testScript: DialogueScript = [
  { speaker: "A", text: "Hello everyone!" },
  { speaker: "B", text: "Great to be here." },
  { speaker: "A", text: "Let's get started." },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("synthesizeScript", () => {
  it("calls synthesize for each line", async () => {
    const provider = createMockProvider();
    (provider.synthesize as ReturnType<typeof vi.fn>)
      .mockResolvedValue(Buffer.from("audio"));

    await synthesizeScript(provider, testScript, "voiceA", "voiceB");

    expect(provider.synthesize).toHaveBeenCalledTimes(3);
  });

  it("uses voiceAId for Host A and voiceBId for Host B", async () => {
    const provider = createMockProvider();
    (provider.synthesize as ReturnType<typeof vi.fn>)
      .mockResolvedValue(Buffer.from("audio"));

    await synthesizeScript(provider, testScript, "voice-A-id", "voice-B-id");

    expect(provider.synthesize).toHaveBeenNthCalledWith(
      1,
      "Hello everyone!",
      "voice-A-id"
    );
    expect(provider.synthesize).toHaveBeenNthCalledWith(
      2,
      "Great to be here.",
      "voice-B-id"
    );
    expect(provider.synthesize).toHaveBeenNthCalledWith(
      3,
      "Let's get started.",
      "voice-A-id"
    );
  });

  it("returns Buffer[] in correct order", async () => {
    const provider = createMockProvider();
    (provider.synthesize as ReturnType<typeof vi.fn>)
      .mockImplementation((text: string) =>
        Promise.resolve(Buffer.from(`audio-${text}`))
      );

    const result = await synthesizeScript(
      provider,
      testScript,
      "voiceA",
      "voiceB"
    );

    expect(result).toHaveLength(3);
    expect(result[0].toString()).toBe("audio-Hello everyone!");
    expect(result[1].toString()).toBe("audio-Great to be here.");
    expect(result[2].toString()).toBe("audio-Let's get started.");
  });

  it("limits concurrency to 3", async () => {
    const provider = createMockProvider();
    let concurrent = 0;
    let maxConcurrent = 0;

    const fiveLineScript: DialogueScript = Array.from({ length: 6 }, (_, i) => ({
      speaker: (i % 2 === 0 ? "A" : "B") as "A" | "B",
      text: `Line ${i}`,
    }));

    (provider.synthesize as ReturnType<typeof vi.fn>)
      .mockImplementation(() => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        return new Promise((resolve) => {
          setTimeout(() => {
            concurrent--;
            resolve(Buffer.from("audio"));
          }, 10);
        });
      });

    await synthesizeScript(provider, fiveLineScript, "vA", "vB");

    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  it("retries up to 2 times on failure then succeeds", async () => {
    const provider = createMockProvider();
    (provider.synthesize as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new TTSError("SYNTHESIS_FAILED", "fail 1"))
      .mockRejectedValueOnce(new TTSError("SYNTHESIS_FAILED", "fail 2"))
      .mockResolvedValue(Buffer.from("audio"));

    const singleScript: DialogueScript = [{ speaker: "A", text: "Hello" }];
    const result = await synthesizeScript(
      provider,
      singleScript,
      "vA",
      "vB"
    );

    expect(result).toHaveLength(1);
    expect(provider.synthesize).toHaveBeenCalledTimes(3);
  });

  it("throws after 3rd failure (2 retries exhausted)", async () => {
    const provider = createMockProvider();
    (provider.synthesize as ReturnType<typeof vi.fn>)
      .mockRejectedValue(new TTSError("SYNTHESIS_FAILED", "always fails"));

    const singleScript: DialogueScript = [{ speaker: "A", text: "Hello" }];
    const error = await synthesizeScript(
      provider,
      singleScript,
      "vA",
      "vB"
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TTSError);
    expect((error as TTSError).code).toBe("SYNTHESIS_FAILED");
    expect(provider.synthesize).toHaveBeenCalledTimes(3);
  });
});
