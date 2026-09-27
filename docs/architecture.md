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
- **`apps/tv` is deliberately not an npm workspace (yet).** The Vega SDK is Linux/macOS-only, so the TV app's dependencies get installed from a Linux shell. Vega also pins its own React Native/React versions, and hoisting those alongside Windows-installed deps could break Metro. How the TV app consumes the shared packages (workspace, Metro `watchFolders`, or a file dependency) gets decided once the Vega project is generated.
- The root `tsc -p tsconfig.json` type-checks every package plus the server and player. `apps/tv` keeps its own Vega-generated tsconfig.
- Tests use Node's built-in `node:test` runner via `tsx`, so there's no test-framework dependency.

## Dependencies (Phase 1)
Root dev deps only: `typescript` (~5.9), `tsx`, `@types/node`. No runtime dependencies yet. A WebSocket library comes in during Phase 4.

## Future AI extension point (not implemented)
`AI Service → Game Engine`. Any AI would only *propose* text (hint phrasing, narration) and never own game truth. The deterministic engine and the authored hints stay authoritative. Nothing in the current architecture depends on this.
