"use client";

import { AudioPlayer } from "@/components/ui/audio-player";

interface ListenPlayerProps {
  src: string;
}

export function ListenPlayer({ src }: ListenPlayerProps) {
  return <AudioPlayer src={src} />;
}
