// Voice-over for the demo video: one Edge TTS clip per segment, placed at its start time.
// Usage: npx tsx apps/server/scripts/voiceover.ts <outDir>
import {mkdirSync, writeFileSync} from 'node:fs';
import {MsEdgeTTS, OUTPUT_FORMAT} from 'msedge-tts';

const SEGMENTS: {at: number; end: number; text: string}[] = [
  {at: 0, end: 15, text: "Friday night. Everyone's on the couch, and everyone has a phone. Room Riddle turns the biggest screen in the house into a crime scene, and every phone into a detective's notebook."},
  {at: 15, end: 35, text: 'There are five complete cases: a noir train mystery, a gothic manor, a tech thriller, a family temple adventure, and an all-ages riddle story. You can filter by age group or story type, so the whole family finds the right case in seconds.'},
  {at: 35, end: 55, text: "One press on Quick Start opens a room. Phones scan the QR code. No app, no account. Up to six investigators, and you're in."},
  {at: 55, end: 85, text: 'This is The Last Train. Midnight, platform two, and the conductor has vanished. You explore the painted scene with the Fire TV remote. Every clue has its own close-up, and every line is spoken aloud, with subtitles. The platform clock says eleven fifty-nine. Remember that.'},
  {at: 85, end: 115, text: 'Now the best part. Pick a suspect on your phone, and ask anything in your own words. Inspector Voss answers on the TV, in character, and in his own voice. He can dodge, and he can lie, but he can only talk about what your group has already discovered. A guarded AI on free models, so he can never spoil the ending.'},
  {at: 115, end: 140, text: 'Clues lead to puzzles. Anyone can answer from their phone, hints cost points, and the server checks every answer, so nobody can cheat. Everything you find is pinned in the case journal, on the TV, and on every phone.'},
  {at: 140, end: 155, text: "When you're ready, the group names the truth together, and the case closes the way you solved it."},
  {at: 155, end: 165, text: 'Room Riddle. Built with React Native for Vega, on Fire TV. Gather. Investigate. Unravel the mystery.'},
];

const out = process.argv[2] ?? 'voiceover';
mkdirSync(out, {recursive: true});
const tts = new MsEdgeTTS();
await tts.setMetadata('en-GB-RyanNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
for (const [i, s] of SEGMENTS.entries()) {
  const {audioStream} = tts.toStream(s.text, {rate: '-2%'});
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    audioStream.on('data', (c: Buffer) => chunks.push(c));
    audioStream.on('end', () => resolve());
    audioStream.on('error', reject);
  });
  writeFileSync(`${out}/seg${i}.mp3`, Buffer.concat(chunks));
  console.log(`seg${i} at ${s.at}s (window ${s.end - s.at}s) ${Buffer.concat(chunks).length} B`);
}
writeFileSync(`${out}/segments.json`, JSON.stringify(SEGMENTS, null, 1));
tts.close();
