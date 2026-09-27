# apps/player: phone companion

Players open this on their phones by scanning the QR code on the TV (or typing the room code). It's an **investigation device**, not a mirror of the TV. It shows clues, evidence, inventory, hints, puzzle input, voting and results.

Status: **skeleton (Phase 1).** Only the planned screen flow exists (`src/app/screens.ts`).

- Targets: mobile browser → installable PWA → Android later.
- The UI stack gets picked in Phase 5, and that decision will be recorded in `docs/architecture.md`.
- Rules: the phone only ever sends *intents* (e.g. "submit answer 1147"). The server decides correctness, score and progression.
- Planned layout: `src/app/` (shell, routing), `src/screens/`, `src/components/`.
