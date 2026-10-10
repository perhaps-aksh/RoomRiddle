import type {AiConfig} from '../config';
import {CharacterService} from './CharacterService';
import {geminiProvider, groqProvider, type AiProvider} from './providers';

export {CharacterService} from './CharacterService';
export type {AiProvider} from './providers';

/** Configured providers in AI_ORDER (default Groq, then Gemini), authored lines always last. */
export function createCharacterService(config: AiConfig, log: (line: string) => void): CharacterService {
  return new CharacterService({
    providers: createProviders(config),
    log,
    timeoutMs: config.timeoutMs,
    maxQuestions: config.maxQuestions,
    cooldownMs: config.cooldownMs,
  });
}

export function createProviders(config: AiConfig, only?: 'gemini' | 'groq'): AiProvider[] {
  const providers: AiProvider[] = [];
  for (const name of config.order) {
    if (only && name !== only) continue;
    if (name === 'gemini' && config.geminiKey) providers.push(geminiProvider(config.geminiKey, config.geminiModel));
    if (name === 'groq' && config.groqKey) providers.push(groqProvider(config.groqKey, config.groqModel));
  }
  return providers;
}
