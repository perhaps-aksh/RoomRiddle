# Architecture

## Layers (separation is mandatory)
| Layer | Responsibility | Lives in |
|---|---|---|
| Presentation | TV UI (remote/D-pad) and phone UI | `apps/tv`, `apps/player` |
| Multiplayer | Rooms, players, WebSocket sync, reconnection, authoritative state | `apps/server` |
| Game engine | Deterministic rules and state transitions | `packages/game-engine` |
| Mystery content | Story, clues, puzzles, hints, answers, choices, endings | `packages/mystery-data` |
| Shared contracts | Types used by all of the above | `packages/shared-types` |
| Design tokens | Colours, spacing, type scale, focus style | `packages/ui` |

Data flows one way: `Mystery Data → Game Engine → Game State → UI`.

## Server authority
```
Phone: "my answer is 1147"  →  Server  →  Game Engine validates  →  new GameState
                                   └──────── broadcast snapshot ────────→ TV + all phones
```
Clients never decide correctness, score, unlocks, timers, progression, endings or player state. Answer keys never leave the server before they're needed.

## Workspace layout decisions
- **npm workspaces**, TypeScript everywhere.
- Internal packages export their TypeScript source (`"main": "./src/index.ts"`) with **no build step**. The server runs through `tsx`. Metro (TV) and the future player bundler can consume TS source directly. We'll add a build step only if a consumer needs one.
- **`apps/tv` is deliberately not an npm workspace.** The Vega SDK is Linux/macOS-only, so the TV app's dependencies get installed from a Linux shell. Vega also pins its own React Native/React versions, and hoisting those alongside Windows-installed deps could break Metro.
- **How the TV consumes the shared packages (decided in Phase 3):** from TypeScript source, with no copying and no npm link. `scripts/wsl-mirror.sh` mirrors `apps/tv` **and** `packages/` into `~/rr-build/repo/` on ext4, keeping the repo layout. Then:
  - Metro has `watchFolders: [../../packages]`, plus `extraNodeModules` mapping `@roomriddle/*` to `packages/*`.
  - `tsconfig.json` has `paths: {"@roomriddle/*": ["../../packages/*/src/index.ts"]}`.
  - Jest has a `moduleNameMapper` for the same paths.
  - The shared packages are dependency-free TS, so they resolve nothing from the TV's `node_modules`.
- The root `tsc -p tsconfig.json` type-checks every package plus the server and player. `apps/tv` keeps its own Vega-generated tsconfig.
- Tests use Node's built-in `node:test` runner via `tsx`, so there's no test-framework dependency.

## Dependencies
- Phase 1: root dev deps only (`typescript` ~5.9, `tsx`, `@types/node`).
- Phase 4 (server only):
  - `ws`: the standard, dependency-free Node WebSocket server.
  - `qrcode-generator`: tiny and dependency-free. It turns the join URL into a module matrix, which the TV draws with plain Views and phones can draw however they like, so no QR library is needed on either client.
  - `@types/ws` (dev).
  - `esbuild` bundles the phone app. It was already in the tree through `tsx` and is now declared as a devDependency of `apps/player`.

## Multiplayer (Phase 4)
```
TV (host) ──ws──┐                     ┌── RoomManager ── Room ── PlayerManager
Phone 1 ───ws───┼── websocket/server ─┤                     └── GameSession ── game-engine.applyAction
Phone 2 ───ws───┘   router, messages  └── SessionManager (tokens)
                    ConnectionManager (sockets ↔ seats, broadcast)
```
- **Protocol:** `packages/shared-types/src/protocol.ts` is the single source of truth. Client → server messages are intents (`CREATE_ROOM`, `JOIN_ROOM`, `RECONNECT`, `LEAVE_ROOM`, `READY`, `START_GAME`, `DISCOVER_CLUE`, `SUBMIT_ANSWER`, `REQUEST_HINT`, `ADVANCE_SCENE`…). Server → client messages are snapshots (`ROOM_CREATED`, `ROOM_JOINED`, `RECONNECT_SUCCESS`, `PLAYER_JOINED/UPDATED/LEFT`, `GAME_STARTED`, `GAME_STATE_UPDATED`, `GAME_COMPLETED`, `ROOM_CLOSED`, `ERROR`). Every message carries `serverTime`, and a reply echoes the request's `requestId`.
- **Authority:**
  - `messages.ts` validates every frame's shape (unknown fields are dropped; oversized frames are refused by `ws` with `maxPayload`).
  - `GameSession` stamps the server clock and calls the Phase 3 engine. The engine alone decides correctness, score, unlocks, hints, scenes and endings.
  - A rejected action throws `INVALID_ACTION` with the engine's reason. Nothing changes and nothing is broadcast.
  - Clients receive `GameState` plus `GameReveals`: only the text they've earned (clue descriptions, used hints, solved narration, the ending). The mystery sent to phones (`PublicMystery`) has no answer keys, hint text or unfound clue descriptions.
- **Roles:** the TV that sends `CREATE_ROOM` is the room's `host` (Game Master). Only the host can `START_GAME`. Any seated client (TV or phone) can send gameplay intents, and the result is broadcast to everyone with who did it (`update.actorName`).
- **Room codes:** 4 random digits from `crypto.randomInt`, unique among live rooms. The join URL is `PUBLIC_URL/join/<code>` (the LAN IP is auto-detected), and the server serves the phone app on the same port.
- **Reconnection:**
  - On `ROOM_CREATED`/`ROOM_JOINED` each client gets a `SessionInfo` (`playerId` + a random 32-byte `sessionToken`, compared in constant time).
  - A dropped socket marks the player `connected: false`; the seat is kept. `RECONNECT` with the token restores the same seat (no duplicate player) and returns the full current state. A newer connection for a seat closes the older one (code 4000).
  - Lobby seats expire after 2 min offline (`LOBBY_PLAYER_GRACE_MS`); in-game seats are kept.
  - If the **host** drops, the game is paused (engine `PAUSE`, so the clock stops) and phones see "waiting for the TV". Its reconnect resumes the game. A room whose host stays away for 10 minutes (`HOST_GRACE_MS`) is closed.
  - `@roomriddle/client` reconnects with backoff and sends `RECONNECT` first, then any queued intents. Phones keep the session in `localStorage`, so a page reload rejoins.
- **Limits:** 2–6 phone players by default (`ROOM_MIN_PLAYERS`/`ROOM_MAX_PLAYERS`), 200 rooms (`MAX_ROOMS`), a per-connection message rate limit, and 10 s ws heartbeats. Everything is in memory, as the brief allows: a server restart ends all rooms.
- **`packages/client`** is the framework-free protocol client shared by the phone app and the TV: `RoomClient` (socket, reconnect, session) plus the `reduceRoomView` reducer. It contains no game rules.
- **Phone app (`apps/player`):** plain TypeScript and DOM, bundled by esbuild into `dist/` and served by the server at `/` and `/join/<code>`. Deliberately unstyled beyond basics: the phone UI stack and design are Phase 5.
- **TV:** `GameProvider` has two modes behind one API. In **local** mode (Phase 3 single-screen play) the engine runs on the TV. In **room** mode, `dispatch(action, onEvents)` sends the intent, and the server's `GameState` replaces local state. So the Phase 3 screens run unchanged and also follow phone actions live. Create Room opens a real server room with its code, QR code and live player list; Start sends `START_GAME`. The server URL is in `apps/tv/src/config/server.ts`.

## Game engine (Phase 3)
`packages/game-engine` is a pure reducer: `applyAction(mystery, state, action) → {state, events}`.
- **State** (`GameState` in `shared-types/game.ts`) is plain JSON with a `schemaVersion`. It can be saved, sent and restored, and `replay(mystery, actions)` rebuilds it from an action log.
- **Actions:**
  - `START_MYSTERY`, `DISCOVER_CLUE`, `SUBMIT_ANSWER`, `REQUEST_HINT`, `ADVANCE_SCENE`, `MAKE_CHOICE`, from the spec.
  - Plus `PAUSE`/`RESUME`, `CLOSE_PUZZLE`, `TICK` and `COMPLETE_MYSTERY`.
  - Actions that happen at a moment carry `at`: the caller supplies the time and the engine never reads a clock.
- **Events** (`answer-correct`, `puzzle-unlocked`, `hint-revealed`, `rejected`…) exist for UI feedback only. The truth is always the state.
- **Invalid actions never throw.** They return the same state plus a `rejected` event with a reason, so a stale or duplicate client message is harmless. This matters for multiplayer.
- **Modules:**
  - `validation.ts`: answer normalisation per input kind.
  - `scoring.ts`: all score arithmetic.
  - `hints.ts`, `timers.ts`, `endings.ts`: rule helpers.
  - `mystery.ts`: content lookups.
  - `selectors.ts`: read-only views for the UI.
  - `validate-mystery.ts`: structural checks for authored content.
- **Answer validation is deliberately dumb:**
  - `digits`: an exact-length digit code; `11:47`, `11.47` and `11 47` are all `1147`.
  - `choice` / `combination`: exact option ids.
  - `text`: case, punctuation and spacing are folded, then an exact match against the accepted list. No fuzzy matching and no keyword search, so "probably the conductor did it" never matches "conductor".
- **Endings** are data: an ordered list of conditions (completion reason, major clues found, hints used, wrong answers). The first match wins.

## TV game screens (Phase 3)
- `GameProvider` (`apps/tv/src/game/GameContext.tsx`) is the only place the TV touches the engine. It stamps actions with the clock and runs a 1 s watchdog that sends `TICK` when time is up.
- Screens read state through selectors and call `dispatch(action)`. No screen contains a game rule. For example, the Puzzle screen doesn't know the answer: it sends the entry and renders the engine's `answer-correct` / `answer-incorrect` / `rejected` event.
- Screens: Intro → Scene (hub) → Investigation / Evidence / Puzzle (with hints and the result panel) → … → Ending.

## Future AI extension point (not implemented)
`AI Service → Game Engine`. Any AI would only *propose* text (hint phrasing, narration) and never own game truth. The deterministic engine and the authored hints stay authoritative. Nothing in the current architecture depends on this.
