# Security Policy

## Reporting a vulnerability
Please **do not open a public issue**. Use GitHub's private reporting: [Report a vulnerability](https://github.com/perhaps-aksh/RoomRiddle/security/advisories/new). Expect a reply within a few days.

## What matters most here
- Anything that lets a client read answer keys, hints, clue text or truth-table facts before the room has earned them.
- A client changing game state without a valid intent (forged results, another player's seat, session hijacking).
- Prompt injection that makes an AI suspect reveal a guarded spoiler or break character.
- Leaks of server-side API keys.

## Design notes
- Keys live only in `apps/server/.env` (git-ignored) and never reach a client.
- Every client frame is shape-validated and rate-limited; session tokens are 32 random bytes compared in constant time.
- There are no accounts and no stored personal data: a player is a nickname for the life of a room, and rooms live in memory.

See [docs/system-design.md](docs/system-design.md#security-and-privacy).
