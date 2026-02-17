"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface PlayerState {
  src: string | null;
  title: string | null;
}

interface PlayerContextValue {
  state: PlayerState;
  play: (src: string, title: string) => void;
  stop: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlayerState>({ src: null, title: null });

  const play = useCallback((src: string, title: string) => {
    setState({ src, title });
  }, []);

  const stop = useCallback(() => {
    setState({ src: null, title: null });
  }, []);

  return (
    <PlayerContext.Provider value={{ state, play, stop }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
