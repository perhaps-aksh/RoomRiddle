import type {
  ClientMessage,
  ErrorCode,
  ServerMessage,
  SessionInfo,
} from '@roomriddle/shared-types';

/**
 * A reconnecting WebSocket client for the RoomRiddle protocol. Framework-free
 * so the phone app (and later others) can share it.
 *
 * - Reconnects with backoff after an unexpected drop and resumes the stored
 *   session (RECONNECT), so a Wi-Fi blip never creates a duplicate player.
 * - Keeps the session in a pluggable store (localStorage on phones).
 */

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface SessionStore {
  load(): SessionInfo | null;
  save(session: SessionInfo | null): void;
}

export interface SocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onclose: ((ev: {code: number}) => void) | null;
  onmessage: ((ev: {data: unknown}) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export interface RoomClientOptions {
  url: string;
  store: SessionStore;
  createSocket?: (url: string) => SocketLike;
  /** ms before each reconnect attempt; the last value repeats. */
  backoff?: number[];
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

type Listener<T> = (value: T) => void;

/** Errors after which the stored session is useless. */
const SESSION_FATAL: ErrorCode[] = ['INVALID_SESSION', 'PLAYER_NOT_FOUND', 'ROOM_NOT_FOUND'];

export class RoomClient {
  private socket: SocketLike | null = null;
  private status: ConnectionStatus = 'idle';
  private attempts = 0;
  private timer: unknown = null;
  /** Set while the user wants to be connected (cleared by close()). */
  private wanted = false;
  private queue: ClientMessage[] = [];
  private readonly messageListeners = new Set<Listener<ServerMessage>>();
  private readonly statusListeners = new Set<Listener<ConnectionStatus>>();
  private nextRequest = 1;
  /** requestId of the RECONNECT sent on the current socket. */
  reconnectRequestId: string | null = null;
  /** Server clock minus local clock, from the latest message. */
  clockOffset = 0;

  constructor(private readonly options: RoomClientOptions) {}

  get connectionStatus(): ConnectionStatus {
    return this.status;
  }

  get session(): SessionInfo | null {
    return this.options.store.load();
  }

  onMessage(listener: Listener<ServerMessage>): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStatus(listener: Listener<ConnectionStatus>): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /** Open the connection. If a session is stored, it is resumed automatically. */
  connect(): void {
    this.wanted = true;
    if (this.socket) return;
    this.open();
  }

  /** Send (queued until the socket is open). Returns the requestId. */
  send(message: ClientMessage): string {
    const requestId = message.requestId ?? `c${this.nextRequest++}`;
    const stamped = {...message, requestId};
    if (this.socket && this.status === 'open') {
      this.socket.send(JSON.stringify(stamped));
    } else {
      this.queue.push(stamped);
      this.connect();
    }
    return requestId;
  }

  /** Forget the session (e.g. after leaving a room). */
  forgetSession(): void {
    this.options.store.save(null);
  }

  close(): void {
    this.wanted = false;
    this.clearRetry();
    this.socket?.close(1000, 'client closed');
    this.socket = null;
    this.setStatus('closed');
  }

  // ─── internals ──────────────────────────────────────────────────────

  private open(): void {
    const create = this.options.createSocket ?? ((url: string) => new WebSocket(url) as unknown as SocketLike);
    this.setStatus(this.attempts === 0 ? 'connecting' : 'reconnecting');
    let socket: SocketLike;
    try {
      socket = create(this.options.url);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      this.attempts = 0;
      this.setStatus('open');
      const session = this.options.store.load();
      // Resume first, so queued actions run as the restored player.
      if (session) {
        this.reconnectRequestId = `c${this.nextRequest++}`;
        socket.send(
          JSON.stringify({
            type: 'RECONNECT',
            roomCode: session.roomCode,
            playerId: session.playerId,
            sessionToken: session.sessionToken,
            requestId: this.reconnectRequestId,
          } satisfies ClientMessage),
        );
      }
      const pending = this.queue;
      this.queue = [];
      for (const message of pending) socket.send(JSON.stringify(message));
    };
    socket.onmessage = event => {
      if (typeof event.data !== 'string') return;
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }
      this.clockOffset = message.serverTime - Date.now();
      this.track(message);
      for (const listener of this.messageListeners) listener(message);
    };
    socket.onclose = event => {
      if (this.socket !== socket) return;
      this.socket = null;
      // 4000 = replaced by a newer connection of ours elsewhere: don't fight it.
      if (!this.wanted || event.code === 4000) {
        this.setStatus('closed');
        return;
      }
      this.scheduleRetry();
    };
    socket.onerror = () => {
      // onclose follows.
    };
  }

  /** Keep the stored session in step with what the server says. */
  private track(message: ServerMessage): void {
    switch (message.type) {
      case 'ROOM_CREATED':
      case 'ROOM_JOINED':
      case 'RECONNECT_SUCCESS':
        this.options.store.save(message.session);
        break;
      case 'LEFT_ROOM':
      case 'ROOM_CLOSED':
        this.options.store.save(null);
        break;
      case 'PLAYER_LEFT':
        if (message.playerId === this.options.store.load()?.playerId) this.options.store.save(null);
        break;
      case 'ERROR':
        // Only a failed resume makes the stored session useless.
        if (message.requestId !== undefined && message.requestId === this.reconnectRequestId && SESSION_FATAL.includes(message.code)) {
          this.options.store.save(null);
        }
        break;
      default:
        break;
    }
  }

  private scheduleRetry(): void {
    this.setStatus('reconnecting');
    const backoff = this.options.backoff ?? [500, 1000, 2000, 4000, 8000];
    const delay = backoff[Math.min(this.attempts, backoff.length - 1)] ?? 8000;
    this.attempts++;
    const setTimer = this.options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.timer = setTimer(() => {
      this.timer = null;
      if (this.wanted && !this.socket) this.open();
    }, delay);
  }

  private clearRetry(): void {
    if (this.timer !== null) {
      (this.options.clearTimer ?? (h => clearTimeout(h as ReturnType<typeof setTimeout>)))(this.timer);
      this.timer = null;
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.statusListeners) listener(status);
  }
}
