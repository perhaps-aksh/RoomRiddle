import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {AccessibilityInfo} from 'react-native';
import AsyncStorage from '@amazon-devices/react-native-async-storage__async-storage';
import {DEFAULT_SETTINGS, parseSettings, Settings, SETTINGS_KEY} from './settings';

/** Where settings live. AsyncStorage on the TV; tests may pass their own. */
export interface SettingsStore {
  read(): Promise<string | null>;
  write(json: string): Promise<void>;
}

export const deviceSettingsStore: SettingsStore = {
  read: () => AsyncStorage.getItem(SETTINGS_KEY),
  write: json => AsyncStorage.setItem(SETTINGS_KEY, json),
};

interface SettingsValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsValue>({settings: DEFAULT_SETTINGS, update: () => undefined});

/**
 * The single home of player preferences (motion, scenes, audio, subtitles).
 * Starts from defaults (plus `initial`, used by tests and launch flags), then
 * applies what this TV saved last time. Every change is saved at once.
 * When nothing was saved for Motion, the OS reduce-motion setting seeds it.
 */
export const SettingsProvider = ({
  children,
  initial,
  store = deviceSettingsStore,
}: {
  children: ReactNode;
  initial?: Partial<Settings>;
  store?: SettingsStore;
}) => {
  const [settings, setSettings] = useState<Settings>(() => ({...DEFAULT_SETTINGS, ...initial}));
  /** Fields the player changed before the stored copy arrived win over it. */
  const touched = useRef(new Set<keyof Settings>());
  const latest = useRef(settings);
  latest.current = settings;

  useEffect(() => {
    let alive = true;
    store
      .read()
      .then(async raw => {
        const saved = parseSettings(raw);
        if (saved.motion === undefined) {
          const osReduced = await Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.()).catch(() => false);
          if (osReduced) {
            saved.motion = 'reduced';
          }
        }
        if (!alive) {
          return;
        }
        const apply = (Object.keys(saved) as (keyof Settings)[]).filter(k => !touched.current.has(k) && saved[k] !== latest.current[k]);
        if (apply.length > 0) {
          setSettings(cur => {
            const next = {...cur};
            for (const k of apply) {
              (next as Record<string, unknown>)[k] = saved[k];
            }
            return next;
          });
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [store]);

  const update = useCallback(
    (patch: Partial<Settings>) => {
      for (const k of Object.keys(patch) as (keyof Settings)[]) {
        touched.current.add(k);
      }
      const next = {...latest.current, ...patch};
      latest.current = next;
      setSettings(next);
      store.write(JSON.stringify(next)).catch(() => undefined);
    },
    [store],
  );

  const value = useMemo(() => ({settings, update}), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export function useSettings(): SettingsValue {
  return useContext(SettingsContext);
}
