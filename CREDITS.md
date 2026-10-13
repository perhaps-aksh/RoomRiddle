# Credits

**Design, code and story:** Chitraksh Kumar ([@perhaps-aksh](https://github.com/perhaps-aksh)).

## Art
- App icon, banner and concept art: AI-assisted illustration, art-directed and edited by the author. Released with the project under the MIT licence.
- The Last Train's scenes, objects, characters, clue close-ups and the menu key art are AI-assisted paintings, art-directed, cut out and edited by the author (`apps/tv/scripts/art/` sizes them for the TV). The other cases still use code-drawn placeholder shapes.
- Screenshots in `docs/images` were captured from the Vega Virtual Device and a phone browser.

## Audio
- Current music, ambience and effects are **placeholders synthesized for development** (`apps/tv/scripts/gen-placeholder-audio.py`). They will be replaced by licensed or CC0 recordings, which will be listed here with their sources.
- Detective narration lines: Microsoft Edge neural voice `en-GB-RyanNeural`, generated for development.
- Live suspect voices are generated at runtime by Microsoft Edge neural TTS (via [`msedge-tts`](https://www.npmjs.com/package/msedge-tts)) and Groq-hosted [Orpheus](https://console.groq.com/docs/text-to-speech) by Canopy Labs.

## Services and libraries
- [Amazon Vega SDK](https://developer.amazon.com/docs/vega/) and React Native for Vega.
- [Groq](https://groq.com/) free tier: `openai/gpt-oss-120b` (OpenAI open-weight model) for suspect dialogue.
- [`ws`](https://github.com/websockets/ws), [esbuild](https://esbuild.github.io/), [tsx](https://github.com/privatenumber/tsx), [ffmpeg](https://ffmpeg.org/) and the React Native Testing Library.

## Fonts
The TV uses Vega's built-in system fonts (Bookerly, Amazon Ember, Amazon Ember Mono); none are bundled.

## Inspiration
*The Yaksha's Three Questions* is inspired by the *Yaksha Prashna* episode of the Mahabharata. The case is an original story and puzzles, not a retelling of scripture.
