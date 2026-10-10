/**
 * The RoomRiddle WebSocket protocol: every message between the server and a
 * client (TV or phone). This file is the single source of truth. Clients and
 * server only ever build messages through these types.
 *
 * Rules:
 * - Clients send intents ("my answer is 1147"). The server decides everything.
 * - Every server message carries a full `room` snapshot, so any single message
 *   is enough to resynchronise a client. Answer keys are never in a snapshot.
 * - `requestId` (optional, client-chosen) is echoed on the reply or ERROR the
 *   request caused, so a client can match results to its own actions.
 */
import type {GameEvent, GameState} from './game';
import type {MysteryId} from './mystery';
import type {Player, PlayerId, PlayerRole} from './player';
import type {PublicMystery, Room, RoomId} from './room';

// ─── Session ──────────────────────────────────────────────────────────

/** Issued on create/join. A client stores it and presents it to RECONNECT. */
export interface SessionInfo {
  roomId: RoomId;
  roomCode: string;
  playerId: PlayerId;
  role: PlayerRole;
  /** Secret. Only the owning client ever receives it. */
  sessionToken: string;
}

// ─── Client → Server ──────────────────────────────────────────────────

/** Gameplay intents. The server turns them into engine actions (adding the time). */
export type GameActionMessage =
  | {type: 'DISCOVER_CLUE'; clueId: string}
  | {type: 'OPEN_PUZZLE'; puzzleId: string}
  | {type: 'CLOSE_PUZZLE'}
  | {type: 'SUBMIT_ANSWER'; puzzleId: string; answer: string}
  | {type: 'REQUEST_HINT'; puzzleId: string}
  | {type: 'ADVANCE_SCENE'}
  | {type: 'MAKE_CHOICE'; choiceId: string; optionId: string};

export type GameActionMessageType = GameActionMessage['type'];

export type ClientMessageBody =
  /** From the TV: open a room and become its host (Game Master). */
  | {type: 'CREATE_ROOM'; mysteryId?: MysteryId}
  /** From a phone. */
  | {type: 'JOIN_ROOM'; roomCode: string; playerName: string}
  /** Resume a session after a dropped connection (no duplicate player is created). */
  | {type: 'RECONNECT'; roomCode: string; playerId: PlayerId; sessionToken: string}
  /** A player leaves for good; the host leaving closes the room. */
  | {type: 'LEAVE_ROOM'}
  | {type: 'READY'; ready: boolean}
  /** Host only. Starts the mystery, or restarts it once completed. */
  | {type: 'START_GAME'}
  /**
   * Question a character (AI-voiced, bound by the case's truth table). Optionally
   * show them a clue the room has found. Never changes game state.
   */
  | {type: 'ASK_CHARACTER'; characterId: string; question: string; evidenceClueId?: string}
  | GameActionMessage;

export type ClientMessage = ClientMessageBody & {requestId?: string};
export type ClientMessageType = ClientMessageBody['type'];

// ─── Server → Client ──────────────────────────────────────────────────

/** QR code as rows of '1' (dark) and '0' (light) modules, quiet zone excluded. */
export type QrMatrix = string[];

/** Who did what, attached to every game state change. Metadata only: never used by rules. */
export interface GameUpdate {
  actorId: PlayerId | null;
  actorName: string | null;
  /** The intent that caused the change, or TIMER / HOST_* for server-driven changes. */
  cause: GameActionMessageType | 'START_GAME' | 'TIMER' | 'HOST_DISCONNECTED' | 'HOST_RECONNECTED';
  at: number;
  /** Engine events, for feedback such as "Aksh found The Platform Clock". */
  events: GameEvent[];
}

export type ServerMessageBody =
  | {type: 'ROOM_CREATED'; room: Room; session: SessionInfo; qr: QrMatrix}
  | {type: 'ROOM_JOINED'; room: Room; session: SessionInfo; mystery: PublicMystery}
  | {type: 'RECONNECT_SUCCESS'; room: Room; session: SessionInfo; mystery: PublicMystery; qr: QrMatrix}
  | {type: 'ROOM_STATE'; room: Room}
  | {type: 'PLAYER_JOINED'; room: Room; player: Player}
  | {type: 'PLAYER_LEFT'; room: Room; playerId: PlayerId; reason: 'left' | 'timed-out'}
  | {type: 'PLAYER_UPDATED'; room: Room; player: Player}
  | {type: 'GAME_STARTED'; room: Room; gameState: GameState; mystery: PublicMystery}
  | {type: 'GAME_STATE_UPDATED'; room: Room; gameState: GameState; update: GameUpdate}
  | {type: 'GAME_COMPLETED'; room: Room; gameState: GameState; endingId: string}
  /** Sent to a player after their own LEAVE_ROOM. */
  | {type: 'LEFT_ROOM'}
  | {type: 'ROOM_CLOSED'; reason: 'host-left' | 'expired'}
  /** A character is composing a reply (for "Voss is thinking…"). */
  | {type: 'CHARACTER_THINKING'; characterId: string; askedBy: string | null}
  | {type: 'CHARACTER_REPLY'; reply: CharacterReply}
  /** The spoken version of a reply, when ready (path on this server, e.g. /voice/ab12.mp3). */
  | {type: 'CHARACTER_VOICE'; replyId: string; characterId: string; audioUrl: string}
  | {type: 'ERROR'; code: ErrorCode; message: string; detail?: string};

/** One answered question, broadcast to the whole room. Presentation only: never a game rule. */
export interface CharacterReply {
  id: string;
  characterId: string;
  characterName: string;
  question: string;
  /** Player name, or null for the TV host. */
  askedBy: string | null;
  evidenceClueId?: string;
  text: string;
  /** 'ai' = generated and checked; 'authored' = a written fallback line. */
  source: 'ai' | 'authored';
  /** Questions the room has left this playthrough. */
  questionsLeft: number;
  /** Set once the spoken version is ready (see CHARACTER_VOICE). */
  audioUrl?: string;
  at: number;
}

export type ServerMessage = ServerMessageBody & {
  /** Server clock (epoch ms) when sent. Clients use it to correct countdowns. */
  serverTime: number;
  requestId?: string;
};
export type ServerMessageType = ServerMessageBody['type'];

// ─── Errors ───────────────────────────────────────────────────────────

export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'INVALID_ROOM_CODE'
  | 'NAME_REQUIRED'
  | 'NAME_TAKEN'
  | 'ROOM_ALREADY_STARTED'
  | 'NOT_HOST'
  | 'NOT_AUTHORIZED'
  | 'NOT_IN_ROOM'
  | 'ALREADY_IN_ROOM'
  | 'NOT_ENOUGH_PLAYERS'
  | 'UNKNOWN_MYSTERY'
  | 'GAME_NOT_STARTED'
  | 'HOST_DISCONNECTED'
  | 'INVALID_ACTION'
  | 'INVALID_MESSAGE'
  | 'RATE_LIMITED'
  | 'PLAYER_NOT_FOUND'
  | 'INVALID_SESSION'
  /** The room has used its questions for this game. */
  | 'QUESTION_LIMIT'
  /** Raised on the client when the server cannot be reached. */
  | 'CONNECTION_FAILED'
  | 'SERVER_ERROR';
