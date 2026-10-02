/**
 * Reassembles server messages that a WebSocket client delivers in pieces.
 *
 * The Vega (Fire TV) WebSocket client can fire `onmessage` with part of a
 * text message: on the Vega Virtual Device a 889-byte PLAYER_JOINED arrived as
 * 677 + 212 bytes, and a 9 KB GAME_STARTED as several pieces. Each piece failed
 * JSON.parse and was dropped, so the TV only caught up when a later message
 * happened to carry the whole room (20-30 s later, or never in a quiet lobby).
 *
 * Every server message is one JSON object, and pieces arrive in order, so we
 * scan the text stream for complete top-level objects (tracking strings and
 * escapes) and emit each one whole. Well-behaved clients (browsers, Node) give
 * whole messages, which pass straight through.
 */

/** Drop a partial message that grows beyond this (garbage, not a slow message). */
const MAX_PENDING = 1 << 20;

export class MessageAssembler {
  private buffer = '';
  private depth = 0;
  private inString = false;
  private escaped = false;
  /** Where `buffer` has been scanned up to. */
  private scanned = 0;

  /** Feed one `onmessage` payload; returns the complete JSON texts it finishes (often exactly one). */
  push(data: string): string[] {
    const out: string[] = [];
    // Fast path: nothing pending and the payload is one whole object.
    if (this.buffer === '' && isWholeObject(data)) {
      out.push(data);
      return out;
    }
    this.buffer += data;
    let start = 0;
    for (let i = this.scanned; i < this.buffer.length; i++) {
      const c = this.buffer.charCodeAt(i);
      if (this.inString) {
        if (this.escaped) this.escaped = false;
        else if (c === 92 /* \ */) this.escaped = true;
        else if (c === 34 /* " */) this.inString = false;
        continue;
      }
      if (c === 34) {
        this.inString = true;
      } else if (c === 123 /* { */) {
        if (this.depth === 0) start = i;
        this.depth++;
      } else if (c === 125 /* } */ && this.depth > 0) {
        this.depth--;
        if (this.depth === 0) {
          out.push(this.buffer.slice(start, i + 1));
          this.buffer = this.buffer.slice(i + 1);
          i = -1;
          start = 0;
        }
      } else if (this.depth === 0) {
        // Text between objects (whitespace, or junk): skip it.
        this.buffer = this.buffer.slice(i + 1);
        i = -1;
      }
    }
    this.scanned = this.buffer.length;
    if (this.buffer.length > MAX_PENDING) this.reset();
    return out;
  }

  /** Forget any partial message (new connection). */
  reset(): void {
    this.buffer = '';
    this.depth = 0;
    this.inString = false;
    this.escaped = false;
    this.scanned = 0;
  }
}

/** Cheap check for the common case: one complete object (no parse). */
function isWholeObject(data: string): boolean {
  if (data.charCodeAt(0) !== 123 || data.charCodeAt(data.length - 1) !== 125) return false;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < data.length; i++) {
    const c = data.charCodeAt(i);
    if (inString) {
      if (escaped) escaped = false;
      else if (c === 92) escaped = true;
      else if (c === 34) inString = false;
    } else if (c === 34) inString = true;
    else if (c === 123) depth++;
    else if (c === 125 && --depth === 0 && i !== data.length - 1) return false;
  }
  return depth === 0 && !inString;
}
