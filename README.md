# RoomRiddle

**Gather. Investigate. Unravel the Mystery.**

RoomRiddle is a cinematic, cooperative mystery game for **Amazon Fire TV on Vega OS**. The TV is the crime scene and the game master. Phones are each player's private notebook and controller. An authoritative server keeps everyone in one synchronized investigation, a deterministic engine decides every answer, and AI-voiced suspects answer questions, but only with what the room has earned.

> Built for the *Build, Ship, Shape: Amazon Developer Hackathon*, Fire TV track (family entertainment, multi-modal UX).

---

## Contents
1. [What it does](#1-what-it-does)
2. [Status](#2-status)
3. [System architecture](#3-system-architecture)
4. [Repository layout](#4-repository-layout)
5. [The game engine](#5-the-game-engine)
6. [Mystery content model and truth tables](#6-mystery-content-model-and-truth-tables)
7. [Multiplayer](#7-multiplayer)
8. [TV app on Vega OS](#8-tv-app-on-vega-os)
9. [Audio system](#9-audio-system)
10. [AI layer](#10-ai-layer)
11. [Expandable mystery library](#11-expandable-mystery-library)
12. [Security and privacy](#12-security-and-privacy)
13. [Testing and quality](#13-testing-and-quality)
14. [Setup and running](#14-setup-and-running)
15. [Performance](#15-performance)
16. [Known limitations](#16-known-limitations)
17. [Documentation index](#17-documentation-index)

---

## 1. What it does

1. The TV opens a room and shows a 4-digit code and a QR code.
2. Players scan it with their phones. No app install, no account.
3. The case opens on the TV: a cinematic scene (for example, a storm-lashed railway platform at 11:52 PM).
4. Players explore with the remote or their phones, inspect objects, discover evidence and solve puzzles together.
5. Players question suspects. Each suspect answers in character, but can only reveal what the room's evidence allows.
6. The group submits its final theory. The engine decides which ending the evidence supports.

Five cases are designed:

| Case | Audience | Length | Mechanics |
|---|---|---|---|
| The Last Train | Teens & adults | 15–25 min | Time code, ticket reconstruction, ledger who/where/when, final theory |
| The Hollow Manor | Teens & adults | 20–30 min | Locked-room evidence, floor-plan alignment, catalogue comparison, final theory |
| Signal Lost | Teens & adults | 20–30 min | Transcript, clock correction, cause analysis, final theory |
| The Forgotten Temple | Family, 8+ | 15–25 min | Symbol matching, sequence, location, preservation choice |
| The Yaksha's Three Questions | All ages | 10–20 min | Reasoning questions, cooperation, symbol order (untimed, no penalties) |

---

## 2. Status

As of 2026-10-10. "Verified" means covered by automated tests and run on the Vega Virtual Device (VVD).

| Area | Status |
|---|---|
| Deterministic game engine (scenes, clues, puzzles, hints, scoring, timers, endings, replay) | **Implemented, verified** |
| Authoritative WebSocket server: rooms, QR join, roles, reconnection, host pause | **Implemented, verified** |
| Phone companion (web, no install) | **Implemented, verified** (UI polish pending) |
| TV app on Vega OS: D-pad focus, case-file screens, lobby, settings | **Implemented, verified on VVD** |
| 2.5D cinematic world for The Last Train (parallax, camera, cinematics, dialogue) | **Implemented, verified on VVD** (placeholder art) |
| Data-driven audio (music states, ambience layers, cues, voice ducking) | **Implemented, verified** (placeholder sounds; emulator audio crackles, see FL-013) |
| The Last Train: full playable case | **Implemented, verified** |
| Truth tables (per-character facts, spoiler guards), server-only | **In progress** |
| Cases 2–5 as playable data | **In progress** |
| AI suspect interrogation (Groq / Gemini, guarded, authored fallback) | **Server done** (Day 2); phone and TV UI next |
| AI adaptive hints, narration, character voices (TTS) | Planned |
| Painted scene art, video loops, real audio | **In progress** |
| Physical Fire TV hardware validation | **Planned** (device being acquired) |
| Downloadable mystery library / marketplace | **Planned** (architecture below) |

---

## 3. System architecture

### 3.1 Context

```mermaid
flowchart LR
  subgraph Home["Living room"]
    TV["Fire TV (Vega OS)<br/>RoomRiddle TV app<br/>React Native for Vega"]
    P1["Phone 1<br/>browser"]
    P2["Phone 2<br/>browser"]
    P3["Phone N<br/>browser"]
  end
  subgraph Server["RoomRiddle server (Node.js + TypeScript)"]
    WS["WebSocket gateway<br/>/ws"]
    HTTP["HTTP<br/>/health, phone app, /join/:code"]
    RM["Rooms + sessions"]
    GS["GameSession"]
    ENG["Game engine<br/>(pure, deterministic)"]
    MD["Mystery data<br/>+ truth tables"]
    AI["AI gateway<br/>(guarded)"]
  end
  LLM1["Gemini API<br/>(free tier)"]
  LLM2["Groq API<br/>(fallback)"]

  TV <-->|"intents / snapshots"| WS
  P1 <--> WS
  P2 <--> WS
  P3 <--> WS
  P1 -->|"scan QR"| HTTP
  WS --> RM --> GS --> ENG --> MD
  GS --> AI
  AI -.-> LLM1
  AI -.-> LLM2
```

Dashed edges are the AI layer (in progress). Everything else is implemented.

### 3.2 Layers

```mermaid
flowchart TB
  subgraph Presentation
    TVUI["apps/tv<br/>screens, 2.5D world, audio renderer"]
    PH["apps/player<br/>phone DOM app"]
  end
  subgraph Contracts
    ST["packages/shared-types<br/>protocol, game, mystery, world, audio"]
    CL["packages/client<br/>RoomClient, reducer, copy"]
    UI["packages/ui<br/>design tokens"]
  end
  subgraph Logic
    EN["packages/game-engine<br/>reducer, validation, scoring, truth gates"]
    SC["packages/scene<br/>camera, director, layout, AudioDirector"]
  end
  subgraph Content
    MD["packages/mystery-data<br/>cases, worlds, audio direction, truth tables"]
  end
  SV["apps/server<br/>authority"]

  TVUI --> CL & UI & SC & ST
  PH --> CL & UI & ST
  SV --> EN & MD & ST
  EN --> ST
  SC --> ST
  MD --> ST
```

Rules:
- **Data flows one way:** `Mystery Data → Game Engine → GameState → UI`.
- **Clients send intents, never results.** A phone sends "my answer is 1147", never "I solved it".
- **The engine is mystery-agnostic.** No case id appears in engine or UI code; everything specific is data.
- **The engine does no I/O and never reads a clock.** Time is passed in, so any game replays from its action log.
- **Presentation is not logic.** The 2.5D world and the audio system react to `GameState`; they never decide anything.

---

## 4. Repository layout

```
apps/
  tv/             Vega OS TV app (React Native for Vega 0.83, TypeScript). Not an npm workspace (Vega SDK is Linux/macOS).
  player/         Phone companion: plain TypeScript + DOM, bundled by esbuild, served by the server.
  server/         Authoritative game server: HTTP + WebSocket (ws), rooms, sessions, QR, AI gateway.
packages/
  shared-types/   Single source of truth: protocol, game state, mystery schema, world and audio types.
  game-engine/    Pure deterministic rules: applyAction(mystery, state, action) → {state, events}.
  mystery-data/   Authored cases: scenes, clues, puzzles, hints, endings, worlds, audio direction, truth tables.
  scene/          Framework-free presentation logic: camera, director, layout, assets, AudioDirector.
  client/         Framework-free protocol client shared by TV and phone.
  ui/             Design tokens (colour, type, spacing, motion) for TV and phone.
docs/             Architecture, development, game design, testing, friction log, research.
```

---

## 5. The game engine

`packages/game-engine` is a pure reducer.

```mermaid
flowchart LR
  A["GameAction<br/>(intent + time)"] --> R{"applyAction"}
  S0["GameState n"] --> R
  M["MysteryDefinition"] --> R
  R --> S1["GameState n+1"]
  R --> E["GameEvents<br/>(feedback only)"]
  R -->|"invalid"| X["same state +<br/>'rejected' event"]
```

- **Actions:** `START_MYSTERY`, `ADVANCE_SCENE`, `DISCOVER_CLUE`, `OPEN_PUZZLE`, `CLOSE_PUZZLE`, `SUBMIT_ANSWER`, `REQUEST_HINT`, `MAKE_CHOICE`, `PAUSE`, `RESUME`, `TICK`, `COMPLETE_MYSTERY`.
- **Invalid actions never throw.** They return the unchanged state plus a `rejected` event, so a stale or duplicated phone message is harmless.
- **Answer validation is exact.** Input kinds: `digits` (`11:47` = `11 47` = `1147`), `choice`, `combination` (one option per field, also used for ordering and matching) and `text` (case, spacing and punctuation folded, then exact match). No fuzzy matching.
- **Scoring, hints, timers and endings are data.** Hints are three authored levels (nudge, connect, explain). Endings are ordered condition lists; the first match wins.
- **State is plain JSON** with a schema version: saved, broadcast, and rebuilt with `replay(mystery, actions)`.

```mermaid
stateDiagram-v2
  [*] --> Lobby
  Lobby --> Intro: START_GAME (host)
  Intro --> Scene: ADVANCE_SCENE
  Scene --> Scene: DISCOVER_CLUE
  Scene --> Puzzle: requirements met
  Puzzle --> Puzzle: wrong answer / hint
  Puzzle --> Scene: solved (next unlocks)
  Scene --> NextScene: ADVANCE_SCENE (scene complete)
  NextScene --> Scene
  Puzzle --> Ending: final puzzle solved
  Scene --> Ending: timer expired / too many attempts
  Ending --> Lobby: replay
```

---

## 6. Mystery content model and truth tables

Every case is a `MysteryDefinition` (TypeScript data in `packages/mystery-data/<case>/`):

```mermaid
classDiagram
  class MysteryDefinition {
    summary
    audience
    intro
    startSceneId
    scenes[]
    clues[]
    puzzles[]
    choices[]
    endings[]
    scoring
    failure
    truth (server-only)
  }
  class Scene { id; narration; clueIds; puzzleIds; nextSceneId }
  class Clue { id; sceneId; prompt; description; major; requires }
  class Puzzle { id; sceneId; input; acceptedAnswers; hints[3]; requires; solvedText; completesMystery }
  class Ending { id; tone; when[]; narration }
  class MysteryTruth { narratorId; solution; characters[]; guarded[]; offLimits }
  class CharacterTruth { id; name; role; persona; interviewable; facts[] }
  class TruthFact { id; kind; false; text; unlockedBy }
  class GuardedTerm { terms[]; until }
  MysteryDefinition --> Scene
  MysteryDefinition --> Clue
  MysteryDefinition --> Puzzle
  MysteryDefinition --> Ending
  MysteryDefinition --> MysteryTruth
  MysteryTruth --> CharacterTruth
  CharacterTruth --> TruthFact
  MysteryTruth --> GuardedTerm
```

**Truth tables** are the authored ground truth for each character:
- a **claim** is what they say publicly (and may be flagged false);
- a **secret** is true but only becomes speakable once its `unlockedBy` requirement (clues found, puzzles solved) holds;
- **guarded terms** are spoilers ("11:47", "lever 7") that no voice may say until the room has earned them.

The engine exposes pure gates over them: `speakableFacts`, `lockedFacts`, `activeGuardedTerms`, `spoilersIn`. The truth table is stripped from everything sent to clients (`toPublicMystery`), and game rules never read it.

`validateMysteryDefinition` runs in tests for every playable case. It fails the build on unreachable scenes, unknown ids, malformed answers, puzzles that need clues from later scenes, broken truth-table references, secrets that are never locked, and guarded terms that can never unlock.

---

## 7. Multiplayer

### 7.1 Server components

```mermaid
flowchart LR
  TV["TV (host)"] -- ws --> GW
  PH1["Phone"] -- ws --> GW
  PH2["Phone"] -- ws --> GW
  GW["websocket/server<br/>messages.ts (validate), router"] --> RMG["RoomManager"]
  GW --> SM["SessionManager<br/>(tokens)"]
  GW --> CM["ConnectionManager<br/>(sockets ↔ seats, broadcast)"]
  RMG --> ROOM["Room"]
  ROOM --> PM["PlayerManager"]
  ROOM --> GSN["GameSession"]
  GSN --> ENG["game-engine.applyAction"]
```

### 7.2 Protocol

`packages/shared-types/src/protocol.ts` is the single source of truth.

| Direction | Messages |
|---|---|
| Client → server | `CREATE_ROOM`, `JOIN_ROOM`, `RECONNECT`, `LEAVE_ROOM`, `READY`, `START_GAME`, `DISCOVER_CLUE`, `OPEN_PUZZLE`, `CLOSE_PUZZLE`, `SUBMIT_ANSWER`, `REQUEST_HINT`, `ADVANCE_SCENE`, `MAKE_CHOICE` |
| Server → client | `ROOM_CREATED`, `ROOM_JOINED`, `RECONNECT_SUCCESS`, `ROOM_STATE`, `PLAYER_JOINED/UPDATED/LEFT`, `GAME_STARTED`, `GAME_STATE_UPDATED`, `GAME_COMPLETED`, `LEFT_ROOM`, `ROOM_CLOSED`, `ERROR` |

Every server message carries `serverTime`; replies echo the request's `requestId`.

### 7.3 A turn, end to end

```mermaid
sequenceDiagram
  autonumber
  participant P as Phone (Aksh)
  participant S as Server
  participant E as Game engine
  participant T as TV
  participant Q as Other phones
  P->>S: SUBMIT_ANSWER {station-clock, "11:47"}
  S->>S: validate frame, rate limit, seat
  S->>E: applyAction(mystery, state, {SUBMIT_ANSWER, at: now})
  E-->>S: state', events [answer-correct, puzzle-unlocked]
  S->>T: GAME_STATE_UPDATED {gameState, update: {actorName, events}, reveals}
  S->>Q: GAME_STATE_UPDATED
  S->>P: GAME_STATE_UPDATED
  T->>T: world reacts: detective line, discovery sound, camera move
```

### 7.4 Joining and reconnection

```mermaid
sequenceDiagram
  participant T as TV
  participant S as Server
  participant P as Phone
  T->>S: CREATE_ROOM {mysteryId}
  S-->>T: ROOM_CREATED {code, QR matrix, session}
  P->>S: GET /join/:code (scan QR)
  S-->>P: phone app
  P->>S: JOIN_ROOM {code, "Aksh"}
  S-->>P: ROOM_JOINED {room, session token, PublicMystery}
  S-->>T: PLAYER_JOINED
  Note over P,S: Wi-Fi drops
  P--xS: socket closed (seat kept, connected=false)
  P->>S: RECONNECT {playerId, sessionToken}
  S-->>P: RECONNECT_SUCCESS (full current state, same seat)
```

- Room codes: 4 random digits (`crypto.randomInt`), unique among live rooms.
- Session tokens: random 32 bytes, compared in constant time; a newer connection for a seat closes the older one.
- If the **host TV** drops, the game pauses (the clock stops) and phones show "waiting for the TV". A room whose host is gone for 10 minutes closes.
- Limits: 2–6 phone players, 200 rooms, per-connection rate limit, 10 s heartbeats. State is in memory by design.
- Vega's WebSocket client can split one message across several `onmessage` events (FL-011); `RoomClient` reassembles them.

---

## 8. TV app on Vega OS

### 8.1 Platform features used

| Vega / Fire TV capability | How RoomRiddle uses it |
|---|---|
| React Native for Vega (RN 0.83) | The whole TV app |
| D-pad focus management (preferred focus, explicit neighbours, focus guides) | Every screen is remote-driven, with a focus frame readable from the couch |
| Back key handling | Back never destroys a room or progress without confirmation |
| W3C media (`@amazon-devices/react-native-w3cmedia`) | Music, ambience, effects and voice through one data-driven backend |
| App lifecycle (foreground/background) | Audio mutes in the background and resumes on return |
| Async storage | Settings persist across launches |
| System fonts (Bookerly, Amazon Ember, Ember Mono) | Three type voices, no bundled fonts |
| Vega Virtual Device + CLI | Scripted device QA (remote keys + screenshots) |
| Planned: Content Launcher / deep links | Open RoomRiddle straight into a case |

### 8.2 Screens and modes

```mermaid
flowchart LR
  Home --> Mysteries["Mystery library"] --> Details --> Intro
  Home --> Create["Create room<br/>(code + QR + lobby)"] --> Intro
  Home --> Settings --> Diag["Audio diagnostics (dev)"]
  Intro --> World["2.5D world<br/>(cinematic setting)"]
  Intro --> CaseFile["Case-file scenes<br/>(casefile setting)"]
  World --> Inspect["Inspect object"] --> World
  World --> Evidence & Puzzle
  CaseFile --> Evidence & Puzzle
  Puzzle --> World
  World --> Ending
  CaseFile --> Ending
```

### 8.3 The 2.5D cinematic world

2D art in depth planes with a camera, not a 3D game, so it stays smooth on a streaming stick.

```mermaid
flowchart TB
  WD["mystery-data/&lt;case&gt;/world<br/>manifest, sets, shots, cinematics, dialogue"] --> DIR
  subgraph scene["packages/scene (pure, tested)"]
    DIR["Director<br/>modes, timeline, dialogue, characters, fades"]
    CAM["Camera<br/>shots, moves, shake, lookShot, occluders"]
    LAY["Layout<br/>objects on planes"]
    AST["Asset registry<br/>final → fallback → placeholder"]
    INT["Interactions<br/>object → engine GameAction"]
  end
  DIR --> STAGE
  CAM --> STAGE
  LAY --> STAGE
  AST --> STAGE
  STAGE["apps/tv/world<br/>Stage, AssetView, Actors, Effects (rain, fog, steam, lightning)"]
  INT -->|"DISCOVER_CLUE"| GP["GameProvider → server"]
  GP -->|"GameState"| DIFF["diffEvents → reactions<br/>(dialogue, sound, camera)"]
  DIFF --> DIR
```

- **Parallax is one rule:** translate = −camera × depth.
- **Assets are swappable by id.** Replacing a placeholder with final art (painted plate, cut-out layer, MP4 loop) only changes the asset map.
- **The world reacts to authoritative state, not to its own input,** so a clue found on a phone produces the same reaction on the TV. Reactions queue behind cinematics.

---

## 9. Audio system

```mermaid
flowchart LR
  subgraph Data["mystery-data"]
    MAN["Audio manifests<br/>(id → file, channel, volume, loop)"]
    DIRN["Audio direction<br/>music states, ambience per set, cues, moments"]
  end
  subgraph Logic["packages/scene"]
    AD["AudioDirector<br/>music state machine, crossfades,<br/>ambient layers, voice ducking (music to 40%)"]
  end
  subgraph TVa["apps/tv/audio"]
    AP["AudioProvider<br/>place, events, settings"]
    BE["w3cBackend<br/>players, pooling, lifecycle counters"]
  end
  GSt["GameState + world place"] --> AP
  MAN & DIRN --> AD
  AP --> AD --> BE --> SPK["W3C media player"]
  SET["Settings: master, music, effects, voice, subtitles"] --> AP
```

- No component names a file: everything is an id resolved through the manifest.
- Effective volume = master × channel × sound volume (× duck for music under voice).
- A missing file never blocks play: it is logged once (`[AUDIO_MISSING]` with id, reason and scene), voice lines keep their subtitles, music and ambience skip.
- A development trace (`[AUDIO_TRACE]`) logs every command and its cause; `apps/tv/scripts/trace-sink.js` collects it from the device.
- Jest journey tests drive the real provider, director and backend through a whole case and assert order, ducking, cleanup and player counts.

---

## 10. AI layer

**Status: interrogation is live on the server** (`apps/server/src/ai/`); the phone/TV interface, hints, narration and voices come next. Keys live only in `apps/server/.env` (git-ignored). The game remains fully playable without AI.

### 10.1 What the AI does
1. **Interrogation:** players pick a suspect on their phone and ask anything (typed, or spoken and transcribed). The suspect answers in character on the TV, with voice and subtitles.
2. **Adaptive hints:** the AI rephrases the next authored hint level for the group's situation. It cannot go beyond that level.
3. **Narration:** the narrator (detective, curator or Yaksha) reacts to discoveries and theories.

### 10.2 What the AI can never do
- Decide whether an answer is correct, unlock anything, or change score or state. Only the engine does.
- See a fact the room has not unlocked. Locked facts are never in the prompt.
- Say a guarded term early. Every reply is checked with `spoilersIn` before anyone sees it.
- Invent evidence. Replies are limited to speakable facts and clues already found.

### 10.3 Interrogation flow

```mermaid
sequenceDiagram
  autonumber
  participant P as Phone
  participant S as Server (GameSession)
  participant G as Truth gates (engine)
  participant A as AI gateway
  participant M as Gemini / Groq
  participant T as TV
  P->>S: ASK_CHARACTER {characterId, question, evidenceClueId?}
  S->>S: per-room budget, per-player cooldown, length cap
  S->>T: CHARACTER_THINKING
  S->>G: speakableFacts(character, state), activeGuardedTerms(state)
  G-->>S: allowed facts, banned terms
  S->>A: persona + allowed facts + found clues + question
  A->>M: generate (short, in character)
  alt provider error or limit
    A->>M: next provider
  end
  M-->>A: reply
  A->>G: spoilersIn(reply) + length + off-limits check
  alt unsafe, or every provider failed
    A-->>S: authored fallback line
  else safe
    A-->>S: reply
  end
  S->>T: CHARACTER_REPLY {characterId, text, audio}
  S->>P: CHARACTER_REPLY
```

### 10.4 Cost and reliability
- Free tiers only, in `AI_ORDER` (default Groq `openai/gpt-oss-120b`, measured 0.5–1.2 s per line, then Gemini), then authored lines. Players never pay and never see a key.
- A per-room question budget (30 per playthrough), a per-player cooldown (4 s), short outputs, a 6 s timeout per provider and reply caching keep usage inside free limits. A rate-limited provider rests for a minute; a denied key rests for ten.
- `npm run ai-smoke -w @roomriddle/server [groq|gemini]` asks real suspects with the real keys and prints which source answered.

### 10.5 Code map
| File | Role |
| --- | --- |
| `ai/prompt.ts` | Builds the prompt from persona, unlocked facts (minus any holding a live spoiler) and found clue titles. Player text is fenced. |
| `ai/providers.ts` | Gemini and Groq REST clients (key in headers, never in URLs). |
| `ai/guard.ts` | Strips stage directions, caps at three sentences, rejects spoilers, unsolved typed answers and out-of-character lines. |
| `ai/fallback.ts` | Authored replies from unlocked first-person facts, or a deflection in a tone suited to the case. |
| `ai/CharacterService.ts` | Budget, cooldown, cache, provider chain, history (last three exchanges per character). Never changes game state. |

### 10.6 Server settings
| Variable | Default | Meaning |
| --- | --- | --- |
| `GROQ_API_KEY`, `GEMINI_API_KEY` | none | Free-tier keys, in `apps/server/.env` only. |
| `AI_ORDER` | `groq,gemini` | Provider order. |
| `GROQ_MODEL` / `GEMINI_MODEL` | `openai/gpt-oss-120b` / `gemini-3.8-flash` | Models. |
| `AI_DISABLED` | unset | `1` = authored lines only (offline demo). |
| `AI_TIMEOUT_MS`, `AI_MAX_QUESTIONS`, `AI_COOLDOWN_MS` | 6000, 30, 4000 | Limits. |
- Voice: server-side free TTS, one fixed voice per character, subtitles always shown. Speech input via Groq Whisper from the phone microphone.

---

## 11. Expandable mystery library

**Status: planned.** Downloaded code cannot safely be executed on the TV, so a mystery pack is **data only**: it describes a case using puzzle types, interactions and effects the installed engine already supports.

```mermaid
flowchart LR
  subgraph Authoring
    AU["Author writes case<br/>(TypeScript data)"] --> VAL["validateMysteryDefinition<br/>+ asset check + playthrough test"]
    VAL --> PK["Pack: manifest.json + assets<br/>id, version, engineVersion, checksums"]
  end
  PK --> CDN["Object storage / CDN"]
  PK --> CAT["Catalogue API + DB<br/>(cases, versions, entitlements)"]
  subgraph Device
    LIB["Library screen"] --> CAT
    LIB --> DL["Downloader<br/>resume, checksum, engine compatibility"]
    DL --> CACHE["Local pack cache"]
    CACHE --> RUN["Engine + world + audio<br/>(same runtime as built-in cases)"]
  end
  CDN --> DL
  STORE["Amazon Appstore IAP"] --> CAT
```

- The server loads the same pack version as the TV before a room starts, so it stays authoritative.
- Packs declare a minimum engine version; incompatible packs are hidden, not crashed.
- Purchases are entitlements verified with the store, separate from downloaded files.

---

## 12. Security and privacy

- Answer keys, hint text, clue descriptions and truth tables never reach a client before they are earned (`PublicMystery` + `GameReveals`).
- Every client frame is shape-validated; unknown fields are dropped; oversize frames are refused; per-connection rate limits apply.
- Session tokens are random 32 bytes, compared in constant time.
- No accounts and no personal data: a player is a nickname for the life of a room. Rooms live in memory.
- API keys are server-side only (`.env`, git-ignored). Questions go to the AI provider without names or identifiers.

---

## 13. Testing and quality

| Suite | Runner | Covers |
|---|---|---|
| `packages/*`, `apps/server`, `apps/player` | `node:test` via `tsx` (`npm run check`) | Engine rules, scoring, validation, playable cases end to end, content validation, scene/camera/director/audio director, protocol, rooms, reconnection |
| `apps/tv` | Jest + React Native Testing Library (`wsl-check.sh`) | Navigation, screens, world, settings, full audio journey through the real game (69 tests) |
| Device | Vega Virtual Device scripts | `vvd-shot.sh` (remote keys + screenshots), `vvd-load.sh` (CPU), audio capture to WAV (`vvd-wav-start.sh`), audio trace sink |
| Lint / types | `tsc --noEmit`, ESLint | All workspaces |

About 270 automated tests run before every commit. See `docs/testing.md`.

---

## 14. Setup and running

### Requirements
- Node.js ≥ 22, npm ≥ 10.
- TV app: Vega SDK on Ubuntu 20.04+ or macOS 10.15+ (this project also runs it under WSL2 on Windows 11; see `docs/development.md`).

### Server + phones (Windows, macOS or Linux)
```bash
npm install
npm run check        # typecheck + all package tests
npm run serve        # build the phone app, start the server on 0.0.0.0:4000
```
Optional AI configuration in `apps/server/.env` (never commit it):
```
GEMINI_API_KEY=...
GROQ_API_KEY=...
```

### TV app
```bash
# inside Ubuntu (or WSL2) with the Vega SDK
source ~/vega/env
bash apps/tv/scripts/wsl-check.sh     # tsc + eslint + jest
bash apps/tv/scripts/wsl-build.sh     # build the .vpkg in an ext4 mirror
bash apps/tv/scripts/wsl-install.sh   # install and launch on the VVD
```
- On the VVD the app reaches the server at `ws://10.0.2.2:4000/ws` through `apps/tv/scripts/vvd-bridge.js`.
- On a physical Fire TV, set `apps/tv/src/config/server.ts` to `ws://<LAN IP>:4000/ws`.

### Play
1. TV: **Create Room**.
2. Phones on the same Wi-Fi: scan the QR code.
3. TV: **Start**.

Without a TV: `npm run fake-tv -w @roomriddle/server`, then `npm run play-bots -w @roomriddle/server -- <code>` plays a scripted game.

---

## 15. Performance

Measured on the Vega Virtual Device (4 vCPU, software rendering), so these are upper bounds:

| Situation | System CPU |
|---|---|
| Idle VVD | ~13% |
| Static screen, reduced motion | ~5% |
| World exploration | 56–62% |
| Arrival cinematic | ~75% |
| Memory | ~600 MB of 3.9 GB |

Every animation uses the native driver and the frame loop runs only while something moves. Real hardware composites on the GPU and will be measured on a Fire TV Stick.

---

## 16. Known limitations

- Emulator audio on the development PC crackles and lags; this is the VVD/WSLg pipeline, not the app (FL-013). Clean audio must be confirmed on hardware.
- Art and sounds are placeholders until the asset pass lands.
- Server state is in memory; a restart ends all rooms.
- The AI layer and cases 2–5 are in progress.

---

## 17. Documentation index

| Document | Contents |
|---|---|
| `docs/architecture.md` | Detailed design decisions per phase |
| `docs/development.md` | Environment setup, Vega under WSL2, daily loop |
| `docs/testing.md` | Test strategy and commands |
| `docs/game-design.md` | Game design notes |
| `docs/friction-log.md` | Verified problems with Vega, the VVD and tooling (product feedback) |
| `docs/research/market-research.md` | Market, audience, family impact, monetization, validation plan |
| `AGENTS.md` | Rules for every contributor |

## License
[MIT](LICENSE)
