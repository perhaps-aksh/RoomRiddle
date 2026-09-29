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

## Current coverage (Phase 4)
- **`game-engine` (55) and `mystery-data` (14):** the Phase 3 engine and The Last Train.
- **`server` (43):**
  - `RoomManager.test.ts`: codes, join rules, name rules, limits, host-only start, the reconnect seat, token checks, lobby expiry, host pause/resume/timeout, and the action log.
  - `websocket/multiplayer.test.ts`: real sockets on a random port. One TV and two phones play The Last Train to The Truth, and each update is checked as identical on all three clients. Also covered: no answer keys or hint text reach phones; reconnect restores the same seat with current state; a newer connection replaces an older one; bad tokens are rejected; the host dropping pauses the game; the host leaving closes the room; malformed, unknown, oversized and forged messages are rejected; duplicate discoveries count once.
  - `app.test.ts`: `/health`, serving the phone app, and path traversal.
- **`client` (7):** queue until open, session storage, reconnect-then-resume ordering, forgetting a rejected session, no retry after a close or replacement, and the RoomView reducer.
- **`player` (1):** HTML escaping.
- **TV (jest, 33):**
  - `Room.spec.tsx`: the TV hosting a room against a fake server that runs the real engine. It checks that the TV sends intents only, follows phone actions, gets wrong answers judged by the server, and shows the ending when a phone finishes.
  - `App.spec.tsx`: the Create Room lobby.
- **Manual/scripted end to end:** `fake-tv` + `play-bots` against the real server over the LAN IP, and two browser phones joining through the real phone app.
