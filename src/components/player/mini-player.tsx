"use client";

import { usePlayer } from "./player-context";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function MiniPlayer() {
  const { state, stop } = usePlayer();

  if (!state.src) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background px-4 py-2 md:left-56">
      <div className="flex items-center gap-2">
        <AudioPlayer
          src={state.src}
          title={state.title ?? undefined}
          className="flex-1"
          compact
        />
        <Button variant="ghost" size="icon" onClick={stop} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
