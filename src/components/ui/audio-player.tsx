"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface AudioPlayerProps {
  src: string;
  title?: string;
  className?: string;
  compact?: boolean;
}

export function AudioPlayer({ src, title, className, compact }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }, [playing]);

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar) return;

    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (audioRef.current) {
      audioRef.current.muted = next;
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <Button variant="ghost" size="icon" onClick={togglePlay} className="shrink-0">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>

      {!compact && title && (
        <span className="hidden truncate text-sm font-medium sm:block sm:max-w-[120px]">
          {title}
        </span>
      )}

      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatTime(currentTime)}
      </span>

      <div
        ref={progressRef}
        className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-muted"
        onClick={handleProgressClick}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-primary transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatTime(duration)}
      </span>

      {!compact && (
        <div className="hidden items-center gap-1 sm:flex">
          <Button variant="ghost" size="icon" onClick={toggleMute} className="shrink-0">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            className="h-1 w-20 accent-primary"
          />
        </div>
      )}
    </div>
  );
}
