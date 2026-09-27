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

## Current coverage (Phase 1)
- `game-engine`: initial state, text normalization.
- `mystery-data`: catalog integrity.
- `server`: `/health` and 404 routing.
