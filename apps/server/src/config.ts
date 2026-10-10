import {networkInterfaces} from 'node:os';

/** Server configuration, from environment variables with safe defaults. */
export interface ServerConfig {
  port: number;
  /** 0.0.0.0 so phones on the LAN can connect. */
  host: string;
  /** Base URL phones use (join links + QR). e.g. http://192.168.1.20:4000 */
  publicUrl: string;
  /** Phone players needed to start / allowed in a room (the TV host is not counted). */
  minPlayers: number;
  maxPlayers: number;
  /** A lobby player who stays disconnected this long loses their seat. */
  lobbyPlayerGraceMs: number;
  /** A room whose host stays disconnected this long is closed. */
  hostGraceMs: number;
  maxRooms: number;
  ai: AiConfig;
}

/** Free-tier character voices. Keys come from apps/server/.env (git-ignored) and never leave the server. */
export interface AiConfig {
  geminiKey: string | null;
  geminiModel: string;
  groqKey: string | null;
  groqModel: string;
  /** Provider order, e.g. ['groq', 'gemini']. */
  order: ('gemini' | 'groq')[];
  timeoutMs: number;
  maxQuestions: number;
  cooldownMs: number;
  /** Spoken replies (free Edge neural voices). VOICES_DISABLED=1 = subtitles only. */
  voices: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = int(env.PORT, 4000);
  return {
    port,
    host: env.HOST ?? '0.0.0.0',
    publicUrl: (env.PUBLIC_URL ?? `http://${detectLanAddress() ?? '127.0.0.1'}:${port}`).replace(/\/+$/, ''),
    minPlayers: int(env.ROOM_MIN_PLAYERS, 2),
    maxPlayers: int(env.ROOM_MAX_PLAYERS, 6),
    lobbyPlayerGraceMs: int(env.LOBBY_PLAYER_GRACE_MS, 2 * 60_000),
    hostGraceMs: int(env.HOST_GRACE_MS, 10 * 60_000),
    maxRooms: int(env.MAX_ROOMS, 200),
    ai: {
      // AI_DISABLED=1 forces authored lines only (offline demo, tests).
      geminiKey: env.AI_DISABLED === '1' ? null : env.GEMINI_API_KEY?.trim() || null,
      geminiModel: env.GEMINI_MODEL ?? 'gemini-3.8-flash',
      groqKey: env.AI_DISABLED === '1' ? null : env.GROQ_API_KEY?.trim() || null,
      groqModel: env.GROQ_MODEL ?? 'openai/gpt-oss-120b',
      // Groq first: measured ~0.5 s per line on the free tier (2026-10-10).
      order: (env.AI_ORDER ?? 'groq,gemini').split(',').map(s => s.trim()).filter((s): s is 'gemini' | 'groq' => s === 'gemini' || s === 'groq'),
      timeoutMs: int(env.AI_TIMEOUT_MS, 6000),
      maxQuestions: int(env.AI_MAX_QUESTIONS, 30),
      cooldownMs: int(env.AI_COOLDOWN_MS, 4000),
      voices: env.VOICES_DISABLED !== '1',
    },
  };
}

function int(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return value !== undefined && Number.isInteger(n) && n >= 0 ? n : fallback;
}

/**
 * Best guess at the LAN address phones can reach. Prefers Wi-Fi/Ethernet
 * adapters and skips virtual ones (WSL, VirtualBox, Docker…). Set PUBLIC_URL
 * when the guess is wrong.
 */
export function detectLanAddress(): string | null {
  const virtual = /vethernet|virtualbox|vmware|docker|wsl|hyper-v|loopback|bluetooth|tailscale|zerotier/i;
  const preferred = /wi-?fi|wlan|wireless|^en\d|^eth\d/i;
  const candidates: {name: string; address: string}[] = [];
  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    if (virtual.test(name)) continue;
    for (const a of addresses ?? []) {
      if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) {
        candidates.push({name, address: a.address});
      }
    }
  }
  const best = candidates.find(c => preferred.test(c.name)) ?? candidates[0];
  return best?.address ?? null;
}
