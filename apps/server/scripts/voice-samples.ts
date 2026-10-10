/** Writes one sample line per character (every case) to a folder, to audition the casting. */
import {mkdirSync, writeFileSync} from 'node:fs';
import {playableMysteries} from '@roomriddle/mystery-data';
import {edgeVoiceProvider, VoiceService} from '../src/ai/voice';

const out = process.argv[2] ?? 'voice-samples';
mkdirSync(out, {recursive: true});
const service = new VoiceService([edgeVoiceProvider()], {log: l => console.log(l)});
for (const m of playableMysteries) {
  for (const c of m.truth?.characters ?? []) {
    if (!c.voice) continue;
    const line = c.facts.find(f => !f.unlockedBy)?.text ?? `I'm ${c.name}.`;
    const id = await service.speak(`I'm ${c.name}. ${line}`, c.voice);
    const clip = id ? service.clip(id) : undefined;
    if (clip) writeFileSync(`${out}/${m.summary.id}--${c.id}.mp3`, clip.data);
    console.log(`${clip ? 'ok  ' : 'FAIL'} ${m.summary.id}/${c.id} ${c.voice.edge}`);
  }
}
process.exit(0);
