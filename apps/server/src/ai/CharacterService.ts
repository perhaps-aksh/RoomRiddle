import {findCharacter, normalizeText} from '@roomriddle/game-engine';
import type {CharacterReply, PlayerId} from '@roomriddle/shared-types';
import {RoomError} from '../errors/errors';
import type {GameSession} from '../game/GameSession';
import type {Room} from '../rooms/Room';
import {authoredReply} from './fallback';
import {checkReply} from './guard';
import {buildCharacterPrompt, type Exchange} from './prompt';
import {ProviderError, type AiProvider} from './providers';

/**
 * Character interviews. The engine decides every outcome; this only gives the
 * suspects a voice. Order: cache → providers in turn (each with a timeout) →
 * guard → authored fallback. Never throws once a question is accepted, and
 * never changes game state.
 */

export interface CharacterServiceOptions {
  providers?: AiProvider[];
  clock?: () => number;
  log?: (line: string) => void;
  /** Per provider call. */
  timeoutMs?: number;
  /** Questions per room per playthrough (keeps the free tier free). */
  maxQuestions?: number;
  /** Minimum gap between one player's questions. */
  cooldownMs?: number;
  /** How long a rate-limited provider is rested. */
  restMs?: number;
}

export interface AskInput {
  characterId: string;
  question: string;
  evidenceClueId?: string;
}

/** An accepted question, ready to answer. */
export interface PendingQuestion {
  session: GameSession;
  characterId: string;
  askedBy: string | null;
  run(): Promise<CharacterReply>;
}

interface Budget {
  asked: number;
  lastAskByPlayer: Map<PlayerId, number>;
  cache: Map<string, string>;
  history: Map<string, Exchange[]>;
}

const HISTORY = 3;
let replySeq = 0;

export class CharacterService {
  private readonly providers: AiProvider[];
  private readonly clock: () => number;
  private readonly log: (line: string) => void;
  private readonly timeoutMs: number;
  readonly maxQuestions: number;
  private readonly cooldownMs: number;
  private readonly restMs: number;
  private readonly budgets = new WeakMap<GameSession, Budget>();
  private readonly restingUntil = new Map<string, number>();

  constructor(options: CharacterServiceOptions = {}) {
    this.providers = options.providers ?? [];
    this.clock = options.clock ?? Date.now;
    this.log = options.log ?? (() => {});
    this.timeoutMs = options.timeoutMs ?? 6000;
    this.maxQuestions = options.maxQuestions ?? 30;
    this.cooldownMs = options.cooldownMs ?? 4000;
    this.restMs = options.restMs ?? 60_000;
  }

  get providerNames(): string[] {
    return this.providers.map(p => p.name);
  }

  /** Synchronous checks; throws RoomError for anything the asker should hear about. */
  accept(room: Room, playerId: PlayerId, input: AskInput): PendingQuestion {
    const session = room.game;
    if (!session || room.status !== 'playing') throw new RoomError('GAME_NOT_STARTED');
    const {mystery} = session;
    const state = session.state;
    const character = findCharacter(mystery, input.characterId);
    if (!character || !character.interviewable) throw new RoomError('INVALID_ACTION', 'character');
    const evidence = input.evidenceClueId ? mystery.clues.find(c => c.id === input.evidenceClueId) : undefined;
    if (input.evidenceClueId && (!evidence || !state.discoveredClueIds.includes(evidence.id))) {
      throw new RoomError('INVALID_ACTION', 'evidence');
    }
    const question = input.question.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!question) throw new RoomError('INVALID_MESSAGE', 'question');

    const budget = this.budget(session);
    const now = this.clock();
    const last = budget.lastAskByPlayer.get(playerId);
    if (last !== undefined && now - last < this.cooldownMs) throw new RoomError('RATE_LIMITED');
    if (budget.asked >= this.maxQuestions) throw new RoomError('QUESTION_LIMIT');
    budget.asked += 1;
    budget.lastAskByPlayer.set(playerId, now);

    const askedBy = room.isHost(playerId) ? null : (room.players.get(playerId)?.name ?? null);
    const run = async (): Promise<CharacterReply> => {
      // State may have moved on while queued; always speak from the latest.
      const current = session.state;
      const history = budget.history.get(character.id) ?? [];
      const prompt = buildCharacterPrompt({mystery, state: current, character, question, askedBy, evidence, history});
      const key = [
        character.id,
        normalizeText(question),
        evidence?.id ?? '',
        prompt.facts.map(f => f.id).join(','),
        current.discoveredClueIds.length,
        current.solvedPuzzleIds.join(','),
      ].join('|');

      let text = budget.cache.get(key);
      let source: CharacterReply['source'] = 'ai';
      if (text === undefined) {
        text = await this.generate(prompt.system, prompt.user, raw => checkReply(mystery, current, character, raw), mystery.summary.id, character.id);
        if (text === undefined) {
          source = 'authored';
          const gentle = /family|all ages|8\+/i.test(mystery.audience?.label ?? '');
          text = authoredReply({character, facts: prompt.facts, question, evidence, gentle});
        } else {
          budget.cache.set(key, text);
        }
      }
      budget.history.set(character.id, [...history, {question, answer: text}].slice(-HISTORY));
      return {
        id: `r${++replySeq}`,
        characterId: character.id,
        characterName: character.name,
        question,
        askedBy,
        ...(evidence ? {evidenceClueId: evidence.id} : {}),
        text,
        source,
        questionsLeft: this.remaining(session),
        at: this.clock(),
      };
    };
    return {session, characterId: character.id, askedBy, run};
  }

  /** Remaining questions this playthrough. */
  remaining(session: GameSession): number {
    return Math.max(0, this.maxQuestions - this.budget(session).asked);
  }

  private async generate(
    system: string,
    user: string,
    check: (raw: string) => {ok: true; text: string} | {ok: false; reason: string},
    caseId: string,
    characterId: string,
  ): Promise<string | undefined> {
    for (const provider of this.providers) {
      const now = this.clock();
      if ((this.restingUntil.get(provider.name) ?? 0) > now) continue;
      const started = Date.now();
      try {
        const raw = await provider.complete({system, user, maxTokens: 160, temperature: 0.7, signal: AbortSignal.timeout(this.timeoutMs)});
        const verdict = check(raw);
        if (verdict.ok) {
          this.log(`[ai] ${caseId}/${characterId} via ${provider.name} in ${Date.now() - started}ms`);
          return verdict.text;
        }
        // A rejected line is not retried elsewhere: the next model was given the same facts.
        this.log(`[ai] ${caseId}/${characterId} ${provider.name} reply rejected (${verdict.reason}): "${raw.slice(0, 120)}"; using authored line`);
        return undefined;
      } catch (err) {
        if (err instanceof ProviderError && err.limited) this.restingUntil.set(provider.name, now + this.restMs);
        if (err instanceof ProviderError && err.denied) this.restingUntil.set(provider.name, now + 10 * this.restMs);
        this.log(`[ai] ${provider.name} failed: ${(err as Error).message}`);
      }
    }
    return undefined;
  }

  private budget(session: GameSession): Budget {
    let budget = this.budgets.get(session);
    if (!budget) {
      budget = {asked: 0, lastAskByPlayer: new Map(), cache: new Map(), history: new Map()};
      this.budgets.set(session, budget);
    }
    return budget;
  }
}
