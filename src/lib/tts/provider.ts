import type { TTSProvider } from "./types";
import { FishAudioProvider } from "./fish-audio";

export function createTTSProvider(): TTSProvider {
  return new FishAudioProvider();
}
