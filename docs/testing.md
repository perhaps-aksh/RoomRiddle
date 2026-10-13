# Testing

## Runner
Node's built-in `node:test`, run through `tsx` so TypeScript files run directly. No extra framework.

```bash
npm test                                 # all workspaces
npm test -w @roomriddle/game-engine      # one workspace
npm run check                            # typecheck + all tests
```
Test files sit next to the code as `*.test.ts`.

## What must be tested
- **Game engine:** every state transition, answer validation per answer type, hint progression, scoring (including no double-scoring), timer expiry, ending selection. The engine is pure, so tests pass `now` in explicitly.
- **Mystery data:** schema integrity. IDs are unique, every referenced clue/puzzle/ending exists, every puzzle has three hints and at least one accepted answer, and each mystery is completable from start to every ending.
- **Server:** room create/join, intent validation, broadcasts, reconnection, and making sure clients can't claim results.
- **TV:** remote-only navigation walkthroughs on the Vega Virtual Device (manual checklist per milestone, automated where Vega tooling allows).

## Totals (2026-10-12)
| Suite | Tests |
|---|---|
| `game-engine` | 58 |
| `mystery-data` (validation + automatic playthrough of all five cases) | 22 |
| `scene` | 52 |
| `client` | 19 |
| `ui` | 4 |
| `server` (rooms, multiplayer, AI prompt/guard/fallback/service, voices, HTTP) | 78 |
| `player` | 11 |
| **Root `npm run check`** | **244** |
| TV, Jest (`apps/tv/scripts/wsl-check.sh`) | 75 |

CI (`.github/workflows/ci.yml`) runs `npm run check` on every push to `main` and every pull request, with `AI_DISABLED=1` and `VOICES_DISABLED=1`, so no keys or network are needed. The AI tests use fake providers. The TV suite needs the Vega SDK and runs locally.

The sections below record coverage as it grew, phase by phase.

## Coverage at Phase 6
- **`game-engine` (55) and `mystery-data` (14):** the Phase 3 engine and The Last Train.
- **`server` (43):**
  - `RoomManager.test.ts`: codes, join rules, name rules, limits, host-only start, the reconnect seat, token checks, lobby expiry, host pause/resume/timeout, and the action log.
  - `websocket/multiplayer.test.ts`: real sockets on a random port. One TV and two phones play The Last Train to The Truth, and each update is checked as identical on all three clients. Also covered: no answer keys or hint text reach phones; reconnect restores the same seat with current state; a newer connection replaces an older one; bad tokens are rejected; the host dropping pauses the game; the host leaving closes the room; malformed, unknown, oversized and forged messages are rejected; duplicate discoveries count once.
  - `app.test.ts`: `/health`, serving the phone app, and path traversal.
- **`ui` (4):** tokens are complete; text meets contrast on the surfaces it is used on; reduced motion shortens every motion; the CSS variables cover every token.
- **`scene` (21, Phase 6):** asset resolution and fallbacks, camera easing, `lookShot`, `occluders`, parallax maths, mode policies, train curves, the director (cinematic, skip, dialogue, characters), interaction mapping to engine actions, manifest validation, and a safe-frame layout check: at every resting shot, every object sits clear of the header and the action bar.
- **`client` (19):**
  - Queue until open, session storage, reconnect-then-resume ordering, forgetting a rejected session, no retry after a close or replacement, and the RoomView reducer.
  - `reconnectNow()` skips the backoff wait.
  - Every error code has a designed experience with a way forward and no technical jargon.
  - Phase 6: `MessageAssembler` rebuilds messages split at every byte position (inside strings and escapes), several messages in one payload, and a large message in many pieces. `RoomClient` reassembles a split `PLAYER_JOINED` (FL-011).
- **`player` (8):**
  - HTML escaping.
  - The screen flow.
  - The lobby identity and seat, with offline players shown.
  - Refused joins are explained in plain words and never show the raw code.
  - Every error state has a recovery action.
  - The reconnect strip appears without leaving the current screen.
- **TV (jest, 45):**
  - `Room.spec.tsx`: the TV hosting a room against a fake server that runs the real engine. Checks:
    - the TV sends intents only and follows phone actions;
    - wrong answers are judged by the server, and a phone finishing shows the ending;
    - Phase 5: join and drop toasts with seat states; a refused start explained without the error code; a dropped TV connection shows the quiet strip, then the blocking error after 6 s, then Retry leads to RECONNECT and "CONNECTION RESTORED".
  - `App.spec.tsx`: the Create Room lobby, Settings (including the live Motion setting surviving navigation), and the evidence empty state.
  - `Game.spec.tsx`: the full local playthrough and puzzle feedback.
  - `World.spec.tsx` (Phase 6, 7 tests):
    - the arrival cinematic and Back to skip it;
    - inspecting the clock: the clue reaches the engine, the detective reacts, and the puzzle unlocks;
    - closing an inspection returns focus to the object, or to the puzzle it just unlocked;
    - scenery sends nothing to the engine;
    - Back asks before leaving;
    - Settings → Scenes switches to case files;
    - in a room, a phone's discovery reaches the world and the detective reacts;
    - a teammate's discovery during the cinematic waits until it ends.
- **Manual/scripted end to end (Phase 5, 2026-09-29):**
  - Setup: the real server on the LAN IP, the new TV build on the VVD hosting room 8805, the redesigned phone in a browser, plus two bots.
  - The phone showed a designed "ROOM NOT FOUND" for a bad code, joined, saw the roster fill, and followed the game to "THE TRUTH · 630" with identical state on all clients.
  - Screenshots are in the vault (`Assets/p5-*.png`).
- **On the VVD (Phase 6, 2026-10-02 and 2026-10-05).** Scripted with `apps/tv/scripts/vvd-shot.sh` (remote keys plus screenshots).
  - Local play: the arrival cinematic, then exploration, inspection, clues, the unlocked lead, the 1147 puzzle, Continue and the transition into the train.
  - Room play: TV host plus two bots (`BOT_STEP_MS=14000`) through station, train, carriage and signal box to "THE TRUTH · 610". The TV followed every phone action live and showed the room HUD (2/2 online, score).
  - Screenshots are in the vault (`Assets/p6-*.png`). Load figures are in `architecture.md`.

