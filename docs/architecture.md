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

## Design system and experience layer (Phase 5)
Direction: **Cinematic Investigation Interface**. Cinema, a detective's case file and a calm investigation system, presented as premium TV UI. Phase 5 changed how the game is presented, not how it works: no engine, protocol or server rule changed.

- **`packages/ui`** is the single source of visual truth. It holds plain values only (no React, no DOM), so the TV and the phone both consume it.
  - `theme/colors.ts`: a semantic palette (background, surface*, text*, accent*, focus*, signal*, success/warning/danger, border, overlay, paper, tones). "Night" blue-blacks and brass, evolved from the Phase 2 navy and gold.
  - `theme/typography.ts`: three voices, each with a job.
    - **Cinematic** serif (Bookerly): titles, narration, endings.
    - **Functional** sans (Amazon Ember): instructions and buttons.
    - **Technical** mono (Amazon Ember Mono): room codes, times, scores, evidence numbers.
    - All three ship on Fire TV, so no fonts are bundled. The phone gets fallbacks.
  - `theme/layout.ts`: spacing, radii, borders, shadows and touch-target sizes, with TV values in 1920×1080 design px and phone values in CSS px.
  - `theme/motion.ts`: semantic motions (`focusIn`, `screenEnter`, `discovery`, `failure`, `endingReveal`…) plus `reducedMotion()`. Rule: motion must communicate focus, a state change, discovery, progression, feedback or a transition. Focus motion stays under 200 ms.
  - `css.ts`: `cssVariables()` turns the same tokens into CSS custom properties. The player build writes them to `tokens.css`, including a `prefers-reduced-motion` block.
  - `tokens.ts` stays as a Phase 2 compatibility re-export.
- **`packages/client/experience.ts`** holds the shared copy both clients use:
  - Every protocol error code gets a title, a plain-language message and at least one recovery action. A test forbids technical jargon in this copy.
  - Loading states share one vocabulary (`CONNECTING TO ROOM`, `JOINING INVESTIGATION`, `RECONNECTING`…).
- **TV primitives, `apps/tv/src/ui/`.** React Native components can't be shared with the DOM phone, so these live in the TV app:
  - `motion.tsx`: turns tokens into `Animated` timings. It holds the reduced-motion preference (`MotionProvider`, seeded from the OS where available and switchable in Settings). Reduced motion is applied here and only here.
  - `focus.tsx`, `TVButton` and `FocusableCard`: the focus identity (see below).
  - `Transition`: entrance presets `fade`, `rise`, `scale`, `slide`, `reveal` and `cinematic`.
  - `RRText`, `RRPanel`, `RRBadge`/`StatusDot`, `RRProgress`, `RRModal`, `Toast` (provider plus queue), `Feedback` (success/failure/hint/info), `LoadingState` (the scanner) and `ErrorState`.
  - `cues.ts`: interaction hook points (focus moved, clue found, answer right or wrong). Handlers are stubs for now; audio arrives in P7.
- **TV focus.** The focused element gets:
  - a quick scale-up (1.045; cards 1.05);
  - a brass focus frame with corner brackets that tighten in;
  - a warm fill and a ▶ marker.
  Losing focus scales down faster than gaining it scales up, so movement feels immediate. With reduced motion there is no scale and no bracket movement, only colour.
- **Connection feedback.** `game/RoomWatcher.tsx` watches the hosted room.
  - Players joining, dropping or coming back produce toasts. Lobby seats fill and mark offline players.
  - When the TV's own socket drops, a quiet "RECONNECTING" strip appears first. After 6 s it becomes a blocking "CONNECTION INTERRUPTED" screen with Retry (`RoomClient.reconnectNow()`) and Return Home. When the connection comes back, a "CONNECTION RESTORED" toast confirms it.
- **Phone** (`apps/player`):
  - `render.ts`: pure screen functions of `(RoomView, UiState)`. The flow is join → joining → lobby → game → ending, plus reconnecting, rejoin error and room closed.
  - `main.ts`: state and events only.
  - `app.css`: uses tokens only, with no raw colours. Layout is responsive (small phones, larger phones, landscape), touch targets are at least 48 px, and it honours `prefers-reduced-motion`.

## 2.5D cinematic world (Phase 6)
Scenes can now be played as a 2.5D world (default) instead of as P5 case files. It is 2D art in depth layers with a camera, not a 3D game. The world is presentation only: every action still goes through the engine or the server, as before.

- **Layers of responsibility:**
  - `packages/shared-types/world.ts`: world types (assets, depth planes, sets, cinematics, dialogue). Presentation only.
  - `packages/scene`: pure, framework-free logic, tested with node:test.
    - `assets`: a registry that resolves final art → fallback → procedural placeholder.
    - `camera`: shots, smooth moves, shake, `frameShot`, `lookShot` (keep a focused object in the safe frame), `occluders` (nearer scenery that covers a subject) and `projectBox`.
    - `layout`: places set nodes on planes.
    - `director`: modes, the cinematic timeline, dialogue, characters, train state and fades.
    - `modes`: a per-mode input policy (cinematic disables controls).
    - `train`: movement curves.
    - `interactions`: the only world → game bridge. Objects map to engine clues and dispatch normal `GameAction`s.
    - `validate`: broken references, oversized shapes, and objects under the header or the action bar.
  - `packages/mystery-data/the-last-train/world/`: the manifest (stable ids, `last-train.*`), sets, camera shots, the arrival cinematic and dialogue. No mystery logic lives in components.
  - `apps/tv/src/world/`: rendering only.
    - `Stage` draws the planes.
    - `AssetView`, `Actors` and `Effects` handle art, characters, rain, fog, steam, lights and lightning.
    - `WorldScreen` runs the director, frame loop, hotspots, inspection panel, dialogue and the P5 action bar.
    - `WorldSession` keeps the per-session state: which cinematics have played and where focus was last.
- **Parallax** is one rule for every layer: translate = −camera × depth. There is no per-layer animation code.
- **Assets:** swapping a placeholder for final art is a change to the `art.ts` map only. Scene and game logic never know which one is drawn.
- **The world reacts to authoritative state, not to its own input.**
  - `diffEvents(previous, next)` turns any state change, including a phone's action in a room, into reactions such as dialogue.
  - Reactions queue while a cinematic or another line is on screen, then play when the stage is free.
- **P5 compatibility:**
  - `useSceneHub` and `SceneActions` are shared by both views.
  - **Settings → Scenes** (`cinematicWorld` prop) switches between them.
  - The P5 specs pin the case-file view.
- **Performance on the VVD.** The VVD has 4 vCPUs and software rendering. CPU is system-wide busy %, measured with `apps/tv/scripts/vvd-load.sh`.
  - The idle VVD runs at about 13%. A static screen with Motion: Reduced is 5%.
  - The app-wide backdrop drift costs about 45% by itself on Home. It now stops while the world covers the screen. The gain under the world was 51% in a probe build against 56–62% after the change, which is within VVD noise, so treat it as small.
  - World exploration: 56–62%. The arrival cinematic: about 75%. Memory stays near 600 MB used out of 3.9 GB.
  - Every loop uses the native driver, and the frame loop only runs while something moves.
  - These figures come from an emulator. Real Fire TV hardware composites on the GPU and needs its own measurement.
- **Transport robustness.** The Vega WebSocket client can split one text message across several `onmessage` events (FL-011). `RoomClient` rebuilds whole JSON messages (`client/assembler.ts`), so other clients are unaffected.

## Future AI extension point (not implemented)
`AI Service → Game Engine`. Any AI would only *propose* text (hint phrasing, narration) and never own game truth. The deterministic engine and the authored hints stay authoritative. Nothing in the current architecture depends on this.
