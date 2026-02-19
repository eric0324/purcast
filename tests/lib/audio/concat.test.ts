import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecFile = vi.fn();
const mockWriteFileSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockExistsSync = vi.fn();
const mockUnlinkSync = vi.fn();
const mockMkdirSync = vi.fn();
const mockRmdirSync = vi.fn();

vi.mock("node:child_process", () => ({
  execFile: (...args: unknown[]) => mockExecFile(...args),
}));

vi.mock("node:fs", () => ({
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  unlinkSync: (...args: unknown[]) => mockUnlinkSync(...args),
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  rmdirSync: (...args: unknown[]) => mockRmdirSync(...args),
}));

import { concatAudioSegments } from "@/lib/audio/concat";

beforeEach(() => {
  vi.clearAllMocks();
  // Default: execFile succeeds
  mockExecFile.mockImplementation(
    (_cmd: string, _args: string[], cb: (err: null) => void) => cb(null)
  );
  mockReadFileSync.mockReturnValue(Buffer.from("output-mp3"));
  mockExistsSync.mockReturnValue(true);
});

describe("concatAudioSegments", () => {
  it("writes each segment to /tmp", async () => {
    const segments = [Buffer.from("seg1"), Buffer.from("seg2")];
    await concatAudioSegments(segments);

    // writeFileSync: 2 segments + 1 concat list = 3 calls
    const segCalls = mockWriteFileSync.mock.calls.filter(
      (call: unknown[]) => (call[0] as string).includes("/seg-")
    );
    expect(segCalls).toHaveLength(2);
    segCalls.forEach((call: unknown[]) => {
      expect(call[0]).toMatch(/\/tmp\/purcast-.*\/seg-\d+\.mp3$/);
    });
  });

  it("generates silence and concat list", async () => {
    const segments = [Buffer.from("seg1"), Buffer.from("seg2")];
    await concatAudioSegments(segments);

    // First execFile: generate silence
    expect(mockExecFile).toHaveBeenCalledTimes(2);
    const silenceArgs = mockExecFile.mock.calls[0][1] as string[];
    expect(silenceArgs).toContain("anullsrc=r=44100:cl=stereo");
    expect(silenceArgs).toContain("0.4");

    // Second execFile: concat
    const concatArgs = mockExecFile.mock.calls[1][1] as string[];
    expect(concatArgs).toContain("concat");
    expect(concatArgs).toContain("128k");
  });

  it("writes concat list with silence between segments", async () => {
    const segments = [Buffer.from("seg1"), Buffer.from("seg2")];
    await concatAudioSegments(segments);

    // Find the writeFileSync call for the concat list
    const concatListCall = mockWriteFileSync.mock.calls.find(
      (call: unknown[]) => (call[0] as string).includes("concat.txt")
    );
    expect(concatListCall).toBeDefined();

    const concatContent = concatListCall![1] as string;
    expect(concatContent).toContain("seg-0.mp3");
    expect(concatContent).toContain("silence.mp3");
    expect(concatContent).toContain("seg-1.mp3");
  });

  it("returns Buffer of concatenated audio", async () => {
    const segments = [Buffer.from("seg1"), Buffer.from("seg2")];
    const result = await concatAudioSegments(segments);

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("output-mp3");
  });

  it("cleans up temp files after success", async () => {
    const segments = [Buffer.from("seg1"), Buffer.from("seg2")];
    await concatAudioSegments(segments);

    // Should clean up segment files, silence, output, and concat list
    expect(mockUnlinkSync).toHaveBeenCalled();
    expect(mockUnlinkSync.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it("cleans up temp files after ffmpeg error", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], cb: (err: Error) => void) => {
        cb(new Error("ffmpeg error"));
      }
    );

    const segments = [Buffer.from("seg1")];
    const error = await concatAudioSegments(segments).catch(
      (e: unknown) => e
    );

    expect(error).toBeInstanceOf(Error);
    expect(mockUnlinkSync).toHaveBeenCalled();
  });
});
