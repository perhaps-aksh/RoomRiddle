/**
 * Audio event trace (development only, Phase 7B). One line per thing the
 * AudioManager does, so a run can be checked against the intended order:
 *   cmd    – a command reached the director (with what caused it)
 *   play   – a player was asked for (channel, final volume)
 *   vol    – a playing sound's volume changed (ducking, fades, settings)
 *   stop   – a sound was stopped by the director
 *   end    – the platform said a one-shot finished
 *   missing – a referenced sound has no entry or no file
 *   state  – director snapshot (music, ambient layers, voice, ducked)
 *
 * Lines are kept in memory (tests read them), printed under __DEV__, and,
 * when `traceSink.url` is set, batched to that address (the VVD's system log
 * drops app lines under load; see FL-013). Never on in release builds.
 */

export interface TraceLine {
  t: number;
  kind: 'cmd' | 'play' | 'vol' | 'stop' | 'end' | 'missing' | 'state' | 'mark';
  msg: string;
}

const MAX = 2000;
export const traceLines: TraceLine[] = [];

/** Dev sink, e.g. `http://10.0.2.2:4010/trace` (apps/tv/scripts/trace-sink.js). */
export const traceSink: {url: string | null} = {url: __DEV__ ? 'http://10.0.2.2:4010/trace' : null};

let pending: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sinkDown = false;

const flush = () => {
  flushTimer = null;
  const body = pending.join('\n');
  pending = [];
  if (!traceSink.url || sinkDown || !body) {
    return;
  }
  try {
    fetch(traceSink.url, {method: 'POST', body}).catch(() => {
      sinkDown = true; // no sink running: stop trying until the app restarts
    });
  } catch {
    sinkDown = true;
  }
};

export function trace(kind: TraceLine['kind'], msg: string, now: number = Date.now()): void {
  if (!__DEV__) {
    return;
  }
  traceLines.push({t: now, kind, msg});
  if (traceLines.length > MAX) {
    traceLines.splice(0, traceLines.length - MAX);
  }
  const line = `[AUDIO_TRACE] ${now} ${kind} ${msg}`;
  if (traceSink.url && !sinkDown) {
    pending.push(line);
    if (!flushTimer) {
      flushTimer = setTimeout(flush, 250);
    }
  }
}

export function clearTrace(): void {
  traceLines.length = 0;
}
