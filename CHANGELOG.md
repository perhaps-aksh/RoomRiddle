# Changelog

All notable changes, newest first. The project follows [Conventional Commits](https://www.conventionalcommits.org/); see `git log` for every commit.

## 2026-10-13: Painted art (Day 4)
- The Last Train is painted: 28 world assets (sky to signal box, the train, Detective Grace, every clue object), placed to line up with what's painted.
- Clue clocks keep exact procedural hands over the painted dials (new manifest `overlay`).
- Evidence cards show painted close-ups; the speech bubble shows painted portraits, with a "pressed" expression when shown evidence.
- Home and library key art; case cards with painted headers.
- Fix: a lightning flash cut short no longer leaves a grey veil.

## 2026-10-13: Public release
- **Brand:** the app is now "Room Riddle", with a launcher icon on the TV and a favicon and web manifest on the phone.
- **Docs:** showcase README with screenshots; technical reference moved to `docs/system-design.md`; contributing guide, code of conduct, security policy, credits, `.env.example`, CI and issue/PR templates.

## 2026-10-12: Voices on the TV
- AI suspect voices play on Vega: the server converts clips to fragmented-MP4 AAC and the TV streams them through Media Source (Vega refuses plain `http://` media; FL-014).
- The speech bubble sits above the footer.

## 2026-10-10: AI suspects and five cases
- **AI questioning (server):** prompts built only from unlocked truth-table facts, a reply guard for spoilers, answers and character breaks, authored fallbacks, a question budget, cooldowns and caching. Groq first.
- **Voices:** free Edge neural voices, with Groq Orpheus as a second provider; one voice per character.
- **Phone Question tab:** pick a suspect, ask in your own words, show found evidence.
- **TV speech bubble:** "is thinking…", then the reply with voice and subtitles.
- **Content:** truth tables; *The Hollow Manor*, *Signal Lost*, *The Forgotten Temple* and *The Yaksha's Three Questions* are playable; the library fits five cases.
- Technical README and market research.

## 2026-10-06 to 10-09: Audio and polish (Phase 7)
- Data-driven audio: music states, ambience layers, cues and voice ducking; pooled effect players; saved settings.
- Audio diagnostics; the emulator crackle was traced to the emulator itself (FL-013).
- World fixes: real clock faces, focus tags, remote focus that follows the layout; Play Again in a room.

## 2026-09-29 to 10-05: Design system and 2.5D world (Phases 5 and 6)
- Design tokens shared by TV and phone; redesigned TV and phone screens; connection overlays; reduced motion.
- 2.5D world: asset registry, camera and parallax, director and timelines, rain, fog, steam, lightning, the train and the detective.
- Vega WebSocket messages that arrive in pieces are reassembled (FL-011).

## 2026-09-27 to 09-29: Foundation (Phases 0 to 4)
- Monorepo, development rules, Vega app generated and running on the Vega Virtual Device.
- TV shell with D-pad navigation.
- Deterministic game engine and *The Last Train*, playable end to end.
- Authoritative WebSocket server: rooms, QR join, reconnection, host pause. Phone web app and a shared protocol client.
