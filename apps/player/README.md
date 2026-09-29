# apps/player: phone companion

Players open this on their phones by scanning the QR code on the TV (or typing the room code). It's an **investigation device**, not a mirror of the TV.

Status: **Phase 4, functional.** The full multiplayer flow works:

- **Join:** room code + name. `/join/<code>` (the QR link) pre-fills the code.
- **Lobby:** your name, the players, a ready toggle, and "waiting for the host".
- **Game:** the current scene, Investigate (discover clues), Evidence, the scene's puzzle (digits, choice or combination entry), hints, and Continue.
- **Ending:** the ending narration and the score.
- **States:** connected, reconnecting, paused (TV offline), room closed, and seat lost.

It is deliberately plain. The designed phone experience and the UI stack are **Phase 5**.

- **Stack:** TypeScript + DOM (`src/main.ts`), bundled by esbuild into `dist/`, which the server serves on the same port as the WebSocket.
- **Protocol:** it uses `@roomriddle/client` (the shared reconnecting client). The session is kept in `localStorage`, so a reload or a Wi-Fi drop rejoins the same seat.
- **Rules:** the phone only sends *intents* (e.g. "submit answer 1147"). The server decides correctness, score and progression, and the phone renders the snapshot it gets back. Answer keys and hint text never reach the phone before they're earned.
- **HTML safety:** every server/player string is escaped (`src/html.ts`).
- `src/app/screens.ts` is the original Phase 1 plan of the screen flow, kept for reference.

```bash
npm run build -w @roomriddle/player   # → apps/player/dist
npm run serve                         # repo root: build the phone app + start the server
```
