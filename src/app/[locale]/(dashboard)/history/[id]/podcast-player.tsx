"use client";

import { AudioPlayer } from "@/components/ui/audio-player";

export function PodcastPlayer({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  return <AudioPlayer src={src} title={title} />;
}
