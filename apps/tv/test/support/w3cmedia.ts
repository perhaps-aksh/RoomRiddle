/**
 * Test stand-in for @amazon-devices/react-native-w3cmedia (a native module).
 * Records every player so tests can check what the TV would play.
 */
export const AudioContentType = {CONTENT_TYPE_NONE: 0, CONTENT_TYPE_SPEECH: 1, CONTENT_TYPE_MUSIC: 2, CONTENT_TYPE_MOVIE: 3, CONTENT_TYPE_SONIFICATION: 4} as const;
export const AudioUsageType = {USAGE_NONE: 0, USAGE_MEDIA: 1, USAGE_GAME: 6} as const;

export const players: AudioPlayer[] = [];

export class AudioPlayer {
  src = '';
  volume = 1;
  loop = false;
  autoplay = false;
  error: unknown = null;
  live = true;
  private listeners: Record<string, (() => void)[]> = {};
  constructor(public contentType?: number, public usage?: number) {
    players.push(this);
  }
  async initialize(): Promise<void> {}
  async deinitialize(): Promise<void> {
    this.live = false;
  }
  addEventListener(name: string, cb: () => void): void {
    (this.listeners[name] ??= []).push(cb);
  }
  emit(name: string): void {
    for (const cb of this.listeners[name] ?? []) {
      cb();
    }
  }
  async play(): Promise<void> {}
  pause(): void {}
}

export const W3CLibPolyfill = {install(): void {}};

/** Records appended bytes; opens on the next tick like the real one. */
export class MediaSource {
  static created: MediaSource[] = [];
  appended: unknown[] = [];
  ended = false;
  private listeners: Record<string, (() => void)[]> = {};
  constructor() {
    MediaSource.created.push(this);
    setTimeout(() => (this.listeners.sourceopen ?? []).forEach(cb => cb()), 0);
  }
  addEventListener(name: string, cb: () => void): void {
    (this.listeners[name] ??= []).push(cb);
  }
  addSourceBuffer(_mime: string) {
    const sbListeners: Record<string, (() => void)[]> = {};
    return {
      addEventListener: (name: string, cb: () => void) => (sbListeners[name] ??= []).push(cb),
      appendBuffer: (bytes: unknown) => {
        this.appended.push(bytes);
        setTimeout(() => (sbListeners.updateend ?? []).forEach(cb => cb()), 0);
      },
    };
  }
  endOfStream(): void {
    this.ended = true;
  }
}
