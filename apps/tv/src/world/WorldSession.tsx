import React, {createContext, ReactNode, useContext, useMemo, useRef, useState} from 'react';

/**
 * What the TV remembers about the 2.5D world during one app session:
 * whether the cinematic world is switched on (Settings), which timelines and
 * dialogue lines have already played (so returning from a puzzle doesn't
 * replay the train arrival), and which object was focused last per scene.
 * Presentation memory only; the game itself lives in GameState.
 */
export interface WorldSession {
  enabled: boolean;
  setEnabled: (on: boolean) => void;
  /** Keys are `${gameKey}:${id}`. */
  played: Set<string>;
  lastFocus: Map<string, string>;
}

const noop = () => undefined;
const WorldSessionContext = createContext<WorldSession>({enabled: false, setEnabled: noop, played: new Set(), lastFocus: new Map()});

export const WorldSessionProvider = ({children, initialEnabled = true}: {children: ReactNode; initialEnabled?: boolean}) => {
  const [enabled, setEnabled] = useState(initialEnabled);
  const played = useRef(new Set<string>()).current;
  const lastFocus = useRef(new Map<string, string>()).current;
  const value = useMemo(() => ({enabled, setEnabled, played, lastFocus}), [enabled, played, lastFocus]);
  return <WorldSessionContext.Provider value={value}>{children}</WorldSessionContext.Provider>;
};

export function useWorldSession(): WorldSession {
  return useContext(WorldSessionContext);
}
