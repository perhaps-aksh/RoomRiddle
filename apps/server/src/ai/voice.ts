import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import type {CharacterVoice} from '@roomriddle/shared-types';

/**
 * Spoken lines. Free text-to-speech, made on the server, cached in memory and
 * served at /voice/<id>. Optional: if every provider fails, the TV shows
 * subtitles only. Never on the critical path of a reply.
 */

export interface VoiceClip {
  data: Buffer;
  mime: string;
}

export interface VoiceProvider {
  readonly name: string;
  synthesize(text: string, voice: CharacterVoice, signal: AbortSignal): Promise<VoiceClip>;
}

export const DEFAULT_VOICE: CharacterVoice = {edge: 'en-GB-RyanNeural'};

/** Re-encodes a clip for the TV. Must not throw for a clip it cannot handle: return it unchanged. */
export type ClipTranscoder = (clip: VoiceClip, signal: AbortSignal) => Promise<VoiceClip>;

export const TV_AUDIO_MIME = 'audio/mp4';

/**
 * Fire TV (Vega) only plays network audio over https; over the LAN the app fetches
 * the bytes itself and feeds them to the player through Media Source Extensions,
 * which accept AAC in fragmented MP4 (measured on the VVD: raw MP3 = decode error).
 * Uses the ffmpeg on PATH (or FFMPEG_PATH).
 */
export function ffmpegTranscoder(ffmpeg = process.env.FFMPEG_PATH ?? 'ffmpeg'): ClipTranscoder {
  return (clip, signal) =>
    new Promise((resolve, reject) => {
      const child = spawn(ffmpeg, ['-v', 'error', '-i', 'pipe:0', '-ac', '1', '-c:a', 'aac', '-b:a', '64k', '-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4', 'pipe:1'], {signal, windowsHide: true});
      const out: Buffer[] = [];
      let err = '';
      child.stdout.on('data', (b: Buffer) => out.push(b));
      child.stderr.on('data', (b: Buffer) => (err += b.toString()));
      child.on('error', reject);
      child.on('close', code => {
        const data = Buffer.concat(out);
        if (code === 0 && data.length > 200) resolve({data, mime: TV_AUDIO_MIME});
        else reject(new Error(`ffmpeg exit ${code}: ${err.trim().slice(0, 200)}`));
      });
      child.stdin.on('error', () => undefined);
      child.stdin.end(clip.data);
    });
}

export class VoiceService {
  private readonly cache = new Map<string, VoiceClip>();
  private readonly inflight = new Map<string, Promise<string | null>>();

  constructor(
    private readonly providers: VoiceProvider[],
    private readonly options: {timeoutMs?: number; maxClips?: number; log?: (line: string) => void; transcode?: ClipTranscoder} = {},
  ) {}

  get enabled(): boolean {
    return this.providers.length > 0;
  }

  get providerNames(): string[] {
    return this.providers.map(p => p.name);
  }

  /** Clip id for this line in this voice, or null if no provider could speak it. */
  speak(text: string, voice: CharacterVoice = DEFAULT_VOICE): Promise<string | null> {
    const id = createHash('sha1').update(JSON.stringify([voice.edge, voice.rate ?? '', voice.pitch ?? '', voice.groq ?? '', text])).digest('hex').slice(0, 20);
    if (this.cache.has(id)) return Promise.resolve(id);
    const running = this.inflight.get(id);
    if (running) return running;
    const job = this.make(id, text, voice).finally(() => this.inflight.delete(id));
    this.inflight.set(id, job);
    return job;
  }

  clip(id: string): VoiceClip | undefined {
    return this.cache.get(id);
  }

  private async make(id: string, text: string, voice: CharacterVoice): Promise<string | null> {
    const log = this.options.log ?? (() => {});
    for (const provider of this.providers) {
      const started = Date.now();
      try {
        let clip = await provider.synthesize(text, voice, AbortSignal.timeout(this.options.timeoutMs ?? 8000));
        if (clip.data.length < 200) throw new Error(`clip too small (${clip.data.length} B)`);
        if (this.options.transcode) {
          try {
            clip = await this.options.transcode(clip, AbortSignal.timeout(this.options.timeoutMs ?? 8000));
          } catch (err) {
            log(`[voice] transcode failed, serving ${clip.mime}: ${(err as Error).message}`);
          }
        }
        this.cache.set(id, clip);
        const max = this.options.maxClips ?? 400;
        while (this.cache.size > max) this.cache.delete(this.cache.keys().next().value!);
        log(`[voice] ${voice.edge} via ${provider.name} in ${Date.now() - started}ms (${clip.data.length} B)`);
        return id;
      } catch (err) {
        log(`[voice] ${provider.name} failed: ${(err as Error).message}`);
      }
    }
    return null;
  }
}

/** Groq Orpheus (free tier, GROQ_API_KEY). WAV only. Needs the model terms accepted once in the Groq console. */
export function groqVoiceProvider(apiKey: string, model = 'canopylabs/orpheus-v1-english', fetchImpl: typeof fetch = fetch): VoiceProvider {
  return {
    name: 'groq-orpheus',
    async synthesize(text, voice, signal) {
      if (!voice.groq) throw new Error('no groq voice cast');
      const response = await fetchImpl('https://api.groq.com/openai/v1/audio/speech', {
        method: 'POST',
        signal,
        headers: {'content-type': 'application/json', authorization: `Bearer ${apiKey}`},
        body: JSON.stringify({model, voice: voice.groq, input: text, response_format: 'wav'}),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return {data: Buffer.from(await response.arrayBuffer()), mime: 'audio/wav'};
    },
  };
}

/** XML-escape for SSML. */
export function ssmlText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/**
 * Microsoft Edge "read aloud" neural voices via msedge-tts: free, no key.
 * Unofficial service; if it stops answering, lines fall back to subtitles.
 */
export function edgeVoiceProvider(): VoiceProvider {
  return {
    name: 'edge',
    async synthesize(text, voice, signal) {
      const {MsEdgeTTS, OUTPUT_FORMAT} = await import('msedge-tts');
      const tts = new MsEdgeTTS();
      try {
        await tts.setMetadata(voice.edge, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        const {audioStream} = tts.toStream(ssmlText(text), {rate: voice.rate ?? 'default', pitch: voice.pitch ?? 'default'});
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          const abort = () => reject(new Error('timeout'));
          signal.addEventListener('abort', abort, {once: true});
          audioStream.on('data', (c: Buffer) => chunks.push(c));
          audioStream.on('end', () => resolve());
          audioStream.on('close', () => resolve());
          audioStream.on('error', reject);
        });
        return {data: Buffer.concat(chunks), mime: 'audio/mpeg'};
      } finally {
        tts.close();
      }
    },
  };
}
