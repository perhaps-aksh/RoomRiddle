# Contributing to Room Riddle

Thanks for your interest. Room Riddle started as a hackathon project and welcomes issues, fixes and new cases.

## Ground rules
Read [AGENTS.md](AGENTS.md) first: it is the rulebook for humans and coding agents alike. The short version:

- **The server is authoritative.** Clients send intents ("my answer is 1147"), never results.
- **The engine is pure and mystery-agnostic.** No I/O, no `Date.now()`, no case ids in engine or UI code.
- **Content is data.** Everything about a case lives in `packages/mystery-data`.
- **The TV works with a remote only.** Every focusable element has a visible focus state; Back never destroys progress without asking.
- **AI is optional and guarded.** It may only voice facts the room has unlocked, and the game must play without it.
- **No secrets in git.** Keys go in `apps/server/.env` (see `.env.example`).

## Setup
```bash
npm install
npm run check      # must pass before every commit
npm run serve      # server + phone app on :4000
```
TV app setup (Vega SDK, WSL2 on Windows): [docs/development.md](docs/development.md).

## Workflow
1. Open an issue describing the bug or idea (templates are provided).
2. Branch from `main`: `feat/…`, `fix/…`, `docs/…`.
3. Keep changes small and tested. Add tests next to the code (`*.test.ts`, or `apps/tv/test/*.spec.tsx`).
4. Run `npm run check` (and `apps/tv/scripts/wsl-check.sh` for TV changes).
5. Commit with [Conventional Commits](https://www.conventionalcommits.org/): `feat(tv): …`, `fix(server): …`, `docs: …`.
6. Open a pull request and fill in the template. CI must be green.

## Writing a new case
1. Copy an existing case folder in `packages/mystery-data/src/` (for example `the-forgotten-temple/`).
2. Fill in the `MysteryDefinition`: summary and audience, intro, scenes, clues, puzzles (each with accepted answers and exactly three hints), endings, scoring.
3. Add the **truth table**: each character's persona, public claims and secrets with `unlockedBy`, plus guarded spoiler terms.
4. Register it in `packages/mystery-data/src/index.ts`.
5. Run `npm run check`. The catalog tests validate every reference and **play the case to the end automatically**; they fail if a clue can't be found or a spoiler can never unlock.

Cultural or religious source material must be original, respectful, and never presented as scripture; worship is never a puzzle.

## Reporting Vega / Fire TV friction
Real problems with the Vega SDK, the emulator or tooling go in [docs/friction-log.md](docs/friction-log.md), with steps, expected and actual results, and the workaround. Only verified facts.

## Code of conduct
This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
