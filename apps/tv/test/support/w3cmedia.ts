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
