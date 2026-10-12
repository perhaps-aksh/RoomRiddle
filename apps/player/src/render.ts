/**
 * RoomRiddle phone companion: every screen as a pure function of the room
 * view (server truth) and local UI state (what the player is typing). No
 * game rule is decided here; the server's snapshot is only presented.
 *
 * Visual language matches the TV ("Cinematic Investigation Interface"):
 * cinematic serif for story, functional sans for instructions, mono for codes,
 * times and scores. Colours, type, spacing and motion come from tokens.css,
 * generated from @roomriddle/ui.
 */
import {LOADING_COPY, RECOVERY_LABEL, errorExperience, me, serverNow, type LoadingKind, type RecoveryAction, type RoomView} from '@roomriddle/client';
import {formatClock, isRequirementMet, remainingMs} from '@roomriddle/game-engine';
import type {ErrorCode, PublicPuzzle} from '@roomriddle/shared-types';
import {esc} from './html';

/** Local-only UI state: what the player is typing or looking at. Never game truth. */
export interface UiState {
  code: string;
  name: string;
  joining: boolean;
  tab: 'scene' | 'evidence' | 'suspects';
  /** Suspect open in the Suspects tab. */
  suspectId: string | null;
  /** Clue to show the suspect with the next question. */
  evidenceId: string | null;
  openPuzzleId: string | null;
  drafts: Record<string, string>;
  selections: Record<string, string[]>;
  pendingRequest: string | null;
  feedback: Feedback | null;
  /** Bumped whenever feedback changes so its entrance animation replays. */
  feedbackKey: number;
  /** A join-form problem: the code/name was refused. */
  formError: ErrorCode | null;
}

export type Feedback = {kind: 'ok' | 'bad' | 'info' | 'hint'; title: string; text: string};

export const initialUi = (code: string, name: string): UiState => ({
  code,
  name,
  joining: false,
  tab: 'scene',
  suspectId: null,
  evidenceId: null,
  openPuzzleId: null,
  drafts: {},
  selections: {},
  pendingRequest: null,
  feedback: null,
  feedbackKey: 0,
  formError: null,
});

// ─── Screen selection ─────────────────────────────────────────────────

export type ScreenName = 'join' | 'joining' | 'reconnecting' | 'rejoin-error' | 'lobby' | 'loading' | 'game' | 'ending' | 'ended';

export function screenName(view: RoomView, ui: UiState): ScreenName {
  if (view.ended) return 'ended';
  if (view.session && !view.room) {
    return view.connection === 'open' && view.error ? 'rejoin-error' : 'reconnecting';
  }
  if (!view.room) return ui.joining ? 'joining' : 'join';
  const state = view.room.gameState;
  if (!state || view.room.status === 'lobby') return 'lobby';
  if (!view.mystery) return 'loading';
  if (state.status === 'completed') return 'ending';
  return 'game';
}

export function renderScreen(view: RoomView, ui: UiState): string {
  const name = screenName(view, ui);
  const body = {
    join: () => joinScreen(ui),
    joining: () => loadingState('joining', `Room ${ui.code}`),
    reconnecting: () => loadingState('reconnecting', view.session ? `Room ${view.session.roomCode}` : undefined),
    'rejoin-error': () => errorState(view.error!.code),
    lobby: () => lobbyScreen(view),
    loading: () => loadingState('loading'),
    game: () => gameScreen(view, ui),
    ending: () => endingScreen(view),
    ended: () => endedScreen(view),
  }[name]();
  return `${topBar(view)}<div class="screen" data-screen="${name}">${body}</div>${connectionStrip(view, name)}${feedbackToast(ui, name)}`;
}

// ─── Chrome ───────────────────────────────────────────────────────────

function topBar(view: RoomView): string {
  const c = view.connection;
  const status =
    c === 'open' ? {cls: 'ok', text: 'Connected'}
    : c === 'reconnecting' ? {cls: 'bad', text: 'Reconnecting'}
    : c === 'connecting' ? {cls: 'wait', text: 'Connecting'}
    : c === 'closed' ? {cls: 'bad', text: 'Offline'}
    : null;
  const room = view.room ?? (view.session ? {code: view.session.roomCode} : null);
  return `<header class="topbar">
    <span class="wordmark">Room Riddle</span>
    <span class="topbar-right">
      ${room ? `<span class="chip mono" aria-label="Room ${esc(room.code)}">RM ${esc(room.code)}</span>` : ''}
      ${status ? `<span class="status ${status.cls}" role="status" title="${status.text}"><i></i><span class="status-text">${status.text}</span></span>` : ''}
    </span>
  </header>`;
}

/** A thin strip while the socket retries in the middle of a game. */
function connectionStrip(view: RoomView, screen: ScreenName): string {
  if (view.connection !== 'reconnecting' || screen === 'reconnecting') return '';
  const copy = LOADING_COPY.reconnecting;
  return `<div class="strip" role="status"><span class="spinner" aria-hidden="true"></span><span><b>${copy.title}</b> ${copy.detail}</span></div>`;
}

function feedbackToast(ui: UiState, screen: ScreenName): string {
  if (!ui.feedback || screen !== 'game') return '';
  const f = ui.feedback;
  const glyph = {ok: '✓', bad: '×', info: '•', hint: '◇'}[f.kind];
  return `<div class="toast ${f.kind}" role="status" data-key="${ui.feedbackKey}">
    <span class="toast-glyph" aria-hidden="true">${glyph}</span>
    <span class="toast-text"><b>${esc(f.title)}</b>${f.text ? `<span>${esc(f.text)}</span>` : ''}</span>
  </div>`;
}

// ─── States ───────────────────────────────────────────────────────────

export function loadingState(kind: LoadingKind, meta?: string): string {
  const copy = LOADING_COPY[kind];
  return `<section class="state" aria-busy="true">
    <div class="scanner" aria-hidden="true"><span></span></div>
    <p class="label mono">${esc(copy.title)}</p>
    <p class="muted">${esc(copy.detail)}</p>
    ${meta ? `<p class="chip mono">${esc(meta)}</p>` : ''}
  </section>`;
}

/** A designed error: never a raw code, always a way forward. */
export function errorState(code: ErrorCode): string {
  const x = errorExperience(code);
  const buttons = x.actions
    .filter(a => a !== 'wait')
    .map((a, i) => `<button data-recover="${a}" class="${i === 0 ? '' : 'secondary'}">${esc(RECOVERY_LABEL[a])}</button>`)
    .join('');
  return `<section class="state error-state" role="alert">
    <div class="glyph-ring bad" aria-hidden="true">!</div>
    <h2 class="state-title">${esc(x.title)}</h2>
    <p class="muted">${esc(x.message)}</p>
    <div class="stack">${buttons || `<button data-recover="join-another">${RECOVERY_LABEL['join-another']}</button>`}</div>
  </section>`;
}

// ─── Join ─────────────────────────────────────────────────────────────

function joinScreen(ui: UiState): string {
  const err = ui.formError ? errorExperience(ui.formError) : null;
  const codeBad = err && (err.actions.includes('edit-code') || err.kind === 'room');
  const nameBad = err && err.actions.includes('edit-name');
  const slots = Array.from({length: 4}, (_, i) => `<span class="${ui.code[i] ? 'filled' : i === ui.code.length ? 'active' : ''}">${esc(ui.code[i] ?? '')}</span>`).join('');
  return `<section class="join">
    <p class="eyebrow">Investigation access</p>
    <h1 class="display">Join the<br/>investigation</h1>
    <form id="join-form" autocomplete="off" novalidate>
      <label for="code">Room code</label>
      <div class="code-field ${codeBad ? 'invalid' : ''}">
        <input id="code" class="code-input" inputmode="numeric" pattern="[0-9]*" maxlength="4" value="${esc(ui.code)}" aria-describedby="code-help" aria-invalid="${codeBad ? 'true' : 'false'}" />
        <div class="code-slots" aria-hidden="true">${slots}</div>
      </div>
      <p id="code-help" class="help">Shown on the TV. Scanning its QR code fills it in.</p>
      <label for="name">Investigator name</label>
      <input id="name" class="${nameBad ? 'invalid' : ''}" maxlength="16" value="${esc(ui.name)}" placeholder="e.g. Aksh" autocapitalize="words" aria-invalid="${nameBad ? 'true' : 'false'}" />
      ${err ? `<div class="inline-error" role="alert"><b>${esc(err.title)}</b><span>${esc(err.message)}</span></div>` : ''}
      <button id="join" type="submit" ${ui.joining ? 'disabled' : ''}>${ui.joining ? 'Joining…' : 'Join investigation'}</button>
    </form>
  </section>`;
}

// ─── Lobby ────────────────────────────────────────────────────────────

function lobbyScreen(view: RoomView): string {
  const room = view.room!;
  const self = me(view);
  const players = room.players.filter(p => p.role === 'player');
  const seat = self ? players.findIndex(p => p.id === self.id) + 1 : 0;
  const hostOnline = room.players.find(p => p.role === 'host')?.connected ?? false;
  const online = players.filter(p => p.connected).length;
  const needed = Math.max(0, room.minPlayers - online);
  return `<section class="lobby">
    <div class="badge ok"><i></i>Joined</div>
    <p class="eyebrow">Case file</p>
    <h1 class="display">${esc(view.mystery?.summary.title ?? 'Room Riddle')}</h1>
    <div class="id-card">
      <span class="label mono">Investigator #${String(seat).padStart(2, '0')}</span>
      <span class="id-name">${esc(self?.name.toUpperCase() ?? '')}</span>
    </div>
    <div class="waiting ${hostOnline ? '' : 'bad'}" role="status">
      <span class="scanner small" aria-hidden="true"><span></span></span>
      <span>${hostOnline ? (needed > 0 ? `Waiting for ${needed} more investigator${needed === 1 ? '' : 's'}…` : 'Waiting for the host to start…') : 'The TV is offline. Waiting for it to come back…'}</span>
    </div>
    <div class="section-head"><h3>Investigators</h3><span class="mono muted">${online}/${room.maxPlayers}</span></div>
    <ul class="roster">${players
      .map((p, i) => `<li class="${p.connected ? '' : 'off'} ${p.id === self?.id ? 'self' : ''}">
        <span class="mono seat">${String(i + 1).padStart(2, '0')}</span>
        <span class="who">${esc(p.name)}${p.id === self?.id ? ' <em>(you)</em>' : ''}</span>
        <span class="state-tag ${p.connected ? (p.ready ? 'ok' : '') : 'bad'}">${p.connected ? (p.ready ? 'Ready' : 'Here') : 'Offline'}</span>
      </li>`)
      .join('')}</ul>
    <div class="stack">
      <button id="ready" class="${self?.ready ? 'secondary' : ''}">${self?.ready ? 'Not ready' : "I'm ready"}</button>
      <button id="leave" class="ghost">Leave room</button>
    </div>
  </section>`;
}

// ─── Game ─────────────────────────────────────────────────────────────

function gameScreen(view: RoomView, ui: UiState): string {
  const room = view.room!;
  const state = room.gameState!;
  const mystery = view.mystery!;
  const scene = mystery.scenes.find(s => s.id === state.currentSceneId);
  const left = remainingMs(state, serverNow(view));
  const paused = state.status === 'paused';
  const sceneNo = scene ? mystery.scenes.indexOf(scene) + 1 : 0;

  const hud = `<div class="hud">
    <div><span class="label">Score</span><span class="mono big">${state.score}</span></div>
    ${left !== null ? `<div><span class="label">Time</span><span class="mono big ${left < 5 * 60_000 ? 'warn' : ''}" id="clock">${formatClock(left)}</span></div>` : ''}
    <div><span class="label">Scene</span><span class="mono big">${sceneNo}/${mystery.scenes.length}</span></div>
  </div>
  ${paused ? '<div class="banner bad" role="status"><b>Paused</b> Waiting for the TV to reconnect. Nothing is lost.</div>' : ''}
  <nav class="tabs" role="tablist">
    <button id="tab-scene" role="tab" aria-selected="${ui.tab === 'scene'}" class="${ui.tab === 'scene' ? 'on' : ''}">Scene</button>
    <button id="tab-evidence" role="tab" aria-selected="${ui.tab === 'evidence'}" class="${ui.tab === 'evidence' ? 'on' : ''}">Evidence <span class="mono">${state.discoveredClueIds.length}</span></button>
    ${mystery.cast.some(c => c.interviewable) ? `<button id="tab-suspects" role="tab" aria-selected="${ui.tab === 'suspects'}" class="${ui.tab === 'suspects' ? 'on' : ''}">Question</button>` : ''}
  </nav>`;

  if (ui.tab === 'evidence') return hud + evidenceList(view);
  if (ui.tab === 'suspects') return hud + suspectsView(view, ui);
  if (!scene) return hud;
  const puzzle = ui.openPuzzleId ? mystery.puzzles.find(p => p.id === ui.openPuzzleId) : undefined;
  if (puzzle && !state.solvedPuzzleIds.includes(puzzle.id)) return hud + puzzleView(view, ui, puzzle);

  const clues = scene.clueIds
    .map(id => mystery.clues.find(c => c.id === id)!)
    .filter(c => c && (state.discoveredClueIds.includes(c.id) || isRequirementMet(c.requires, state)));
  const puzzles = scene.puzzleIds.map(id => mystery.puzzles.find(p => p.id === id)!).filter(Boolean);
  const complete = puzzles.every(p => state.solvedPuzzleIds.includes(p.id));
  const isFinal = !scene.nextSceneId;
  const found = clues.filter(c => state.discoveredClueIds.includes(c.id)).length;

  return `${hud}
    <section class="scene">
      <p class="eyebrow"><span class="mono">Scene ${String(sceneNo).padStart(2, '0')}</span> — ${esc(scene.subtitle ?? '')}</p>
      <h1 class="display">${esc(scene.title)}</h1>
      <div class="section-head"><h3>Examine</h3><span class="mono muted">${found}/${clues.length}</span></div>
      ${clues
        .map(c => {
          const isFound = state.discoveredClueIds.includes(c.id);
          const text = room.reveals?.clues[c.id] ?? [];
          const no = state.discoveredClueIds.indexOf(c.id) + 1;
          return isFound
            ? `<article class="evidence"><header><span class="mono">EV-${String(no).padStart(2, '0')}</span><span class="tag ok">✓ Examined</span></header><h4>${esc(c.title)}</h4>${text.map(l => (l === '' ? '<br/>' : `<p>${esc(l)}</p>`)).join('')}</article>`
            : `<button class="option" data-clue="${esc(c.id)}" ${paused ? 'disabled' : ''}><span class="opt-glyph" aria-hidden="true">◇</span>${esc(c.prompt)}</button>`;
        })
        .join('')}
      <div class="section-head"><h3>Puzzle</h3></div>
      ${puzzles
        .map(p => {
          const solved = state.solvedPuzzleIds.includes(p.id);
          const unlocked = state.unlockedPuzzleIds.includes(p.id);
          if (solved) {
            const text = room.reveals?.solvedText[p.id] ?? [];
            return `<article class="evidence solved"><header><span class="tag ok">✓ Solved</span><span class="mono">+${state.puzzlePoints[p.id] ?? 0}</span></header><h4>${esc(p.title)}</h4>${text.map(l => (l === '' ? '<br/>' : `<p>${esc(l)}</p>`)).join('')}</article>`;
          }
          return unlocked
            ? `<button class="primary-card" data-open="${esc(p.id)}" ${paused ? 'disabled' : ''}><span class="label">Ready to solve</span><span class="pc-title">${esc(p.title)}</span><span class="pc-arrow" aria-hidden="true">→</span></button>`
            : `<div class="locked"><span aria-hidden="true">🔒</span><div><h4>${esc(p.title)}</h4><p class="muted">Keep investigating to unlock it.</p></div></div>`;
        })
        .join('')}
      ${complete ? `<button id="advance" ${paused ? 'disabled' : ''}>${isFinal ? 'Finish the mystery' : 'Continue to the next scene'}</button>` : ''}
    </section>`;
}

function puzzleView(view: RoomView, ui: UiState, puzzle: PublicPuzzle): string {
  const state = view.room!.gameState!;
  const reveals = view.room!.reveals;
  const revealed = puzzle.hintIds.flatMap(id => (reveals?.hints[id] !== undefined ? [reveals.hints[id]!] : []));
  const input = puzzle.input;
  let field = '';
  if (input.kind === 'digits' || input.kind === 'text') {
    field = `<label for="answer">Your answer</label>
      <input id="answer" ${input.kind === 'digits' ? `inputmode="numeric" maxlength="${input.length + 2}" class="code-input solo"` : ''} value="${esc(ui.drafts[puzzle.id] ?? '')}" autocomplete="off" />`;
  } else if (input.kind === 'choice') {
    const selected = ui.selections[puzzle.id]?.[0];
    field = `<div class="stack tight" role="radiogroup">${input.options
      .map(o => `<button class="option ${selected === o.id ? 'selected' : ''}" role="radio" aria-checked="${selected === o.id}" data-select="0" data-value="${esc(o.id)}"><span class="opt-glyph" aria-hidden="true">${selected === o.id ? '●' : '○'}</span>${esc(o.label)}</button>`)
      .join('')}</div>`;
  } else {
    field = input.fields
      .map((f, i) => {
        const selected = ui.selections[puzzle.id]?.[i];
        return `<label>${esc(f.label)}</label><div class="grid" role="radiogroup">${f.options
          .map(o => `<button class="option ${selected === o.id ? 'selected' : ''}" role="radio" aria-checked="${selected === o.id}" data-select="${i}" data-value="${esc(o.id)}">${esc(o.label)}</button>`)
          .join('')}</div>`;
      })
      .join('');
  }
  const wrong = state.incorrectAttempts[puzzle.id] ?? 0;
  return `<section class="puzzle">
    <button id="back" class="link">← Back to scene</button>
    <p class="eyebrow">Puzzle${wrong ? ` · <span class="bad-text">${wrong} wrong</span>` : ''}</p>
    <h1 class="display">${esc(puzzle.title)}</h1>
    <div class="story">${puzzle.prompt.map(l => (l === '' ? '<br/>' : `<p>${esc(l)}</p>`)).join('')}</div>
    <p class="question">${esc(puzzle.question)}</p>
    ${revealed.map((text, i) => `<aside class="hint"><span class="label mono">◇ Hint ${i + 1}</span><p>${esc(text)}</p></aside>`).join('')}
    ${field}
    <div class="stack">
      <button id="submit">Confirm answer</button>
      <button id="hint" class="secondary" ${revealed.length >= puzzle.hintCount ? 'disabled' : ''}>${revealed.length >= puzzle.hintCount ? 'No hints left' : `Request hint (${revealed.length}/${puzzle.hintCount})`}</button>
    </div>
  </section>`;
}

function evidenceList(view: RoomView): string {
  const state = view.room!.gameState!;
  const mystery = view.mystery!;
  if (state.discoveredClueIds.length === 0) {
    return `<section class="empty"><div class="glyph-ring" aria-hidden="true">◇</div><p class="label mono">No evidence yet</p><p class="muted">Nothing found yet. Investigate the scene.</p></section>`;
  }
  const sealed = mystery.clues.length - state.discoveredClueIds.length;
  return `<section class="case-file">
    <div class="section-head"><h3>Case file</h3><span class="mono muted">${state.discoveredClueIds.length}/${mystery.clues.length}</span></div>
    ${[...state.discoveredClueIds]
      .reverse()
      .map(id => {
        const clue = mystery.clues.find(c => c.id === id);
        const no = state.discoveredClueIds.indexOf(id) + 1;
        const scene = mystery.scenes.find(s => s.id === clue?.sceneId);
        const text = view.room!.reveals?.clues[id] ?? [];
        return `<article class="evidence"><header><span class="mono">EV-${String(no).padStart(2, '0')}</span><span class="muted">${esc(scene?.title ?? '')}</span></header><h4>${esc(clue?.title ?? id)}</h4>${text.map(l => (l === '' ? '<br/>' : `<p>${esc(l)}</p>`)).join('')}</article>`;
      })
      .join('')}
    ${sealed > 0 ? `<p class="sealed mono">${sealed} sealed</p>` : ''}
  </section>`;
}

// ─── Questioning ──────────────────────────────────────────────────────

const MAX_QUESTION = 200;

function initials(name: string): string {
  return name.replace(/^(Inspector|Detective|The)\s+/i, '').split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

/** Pick a person, ask in your own words, optionally show a found clue. Replies come from the server. */
export function suspectsView(view: RoomView, ui: UiState): string {
  const mystery = view.mystery!;
  const state = view.room!.gameState!;
  const cast = mystery.cast.filter(c => c.interviewable);
  const paused = state.status === 'paused';
  const left = view.conversation.at(-1)?.questionsLeft;
  const suspect = cast.find(c => c.id === ui.suspectId);
  if (!suspect) {
    return `<section class="suspects">
      <p class="eyebrow">Question the people involved</p>
      <h1 class="display">Who will you ask?</h1>
      <p class="muted">Ask in your own words. They only know what they know, and some of them lie. Show them evidence to press them.</p>
      <ul class="cast">${cast
        .map(c => {
          const asked = view.conversation.filter(r => r.characterId === c.id).length;
          return `<li><button class="cast-card" data-suspect="${esc(c.id)}">
            <span class="avatar" aria-hidden="true">${esc(initials(c.name))}</span>
            <span class="cast-text"><b>${esc(c.name)}</b><span class="muted">${esc(c.role)}</span></span>
            ${asked ? `<span class="mono muted">${asked}</span>` : ''}<span class="pc-arrow" aria-hidden="true">→</span>
          </button></li>`;
        })
        .join('')}</ul>
      ${left !== undefined ? `<p class="mono muted">${left} questions left for the group</p>` : ''}
    </section>`;
  }

  const thread = view.conversation.filter(r => r.characterId === suspect.id);
  const thinking = view.thinking?.characterId === suspect.id;
  const found = state.discoveredClueIds.map(id => mystery.clues.find(c => c.id === id)).filter(c => c !== undefined);
  const shown = found.find(c => c.id === ui.evidenceId);
  const out = left === 0;
  return `<section class="interview">
    <button id="suspects-back" class="link">← Everyone</button>
    <div class="cast-head">
      <span class="avatar big" aria-hidden="true">${esc(initials(suspect.name))}</span>
      <div><h1 class="display">${esc(suspect.name)}</h1><p class="muted">${esc(suspect.role)}</p></div>
    </div>
    <ol class="thread" aria-live="polite">${thread
      .map(r => `<li class="q"><span class="label mono">${esc(r.askedBy ?? 'TV')}${r.evidenceClueId ? ` · shows ${esc(mystery.clues.find(c => c.id === r.evidenceClueId)?.title ?? 'evidence')}` : ''}</span><p>${esc(r.question)}</p></li>
        <li class="a"><p>${esc(r.text)}</p></li>`)
      .join('')}
      ${thinking ? `<li class="a thinking" role="status"><span class="dots" aria-label="${esc(suspect.name)} is thinking"><i></i><i></i><i></i></span></li>` : ''}
      ${thread.length === 0 && !thinking ? '<li class="muted empty-thread">No questions yet.</li>' : ''}
    </ol>
    <form id="ask-form" autocomplete="off">
      <label for="question">Your question</label>
      <textarea id="question" rows="2" maxlength="${MAX_QUESTION}" placeholder="e.g. Where were you at midnight?" ${paused || out ? 'disabled' : ''}>${esc(ui.drafts[`ask:${suspect.id}`] ?? '')}</textarea>
      ${found.length
        ? `<label for="evidence">Show evidence <span class="muted">(optional)</span></label>
      <select id="evidence"><option value="">None</option>${found.map(c => `<option value="${esc(c.id)}" ${shown?.id === c.id ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select>`
        : ''}
      <button id="ask" type="submit" ${paused || thinking || out ? 'disabled' : ''}>${out ? 'No questions left' : thinking ? 'Listening…' : 'Ask'}</button>
      ${left !== undefined && !out ? `<p class="mono muted">${left} questions left for the group</p>` : ''}
    </form>
  </section>`;
}

// ─── Ending / ended ───────────────────────────────────────────────────

function endingScreen(view: RoomView): string {
  const room = view.room!;
  const state = room.gameState!;
  const ending = room.reveals?.ending;
  const tone = ending?.tone ?? 'triumph';
  return `<section class="ending tone-${esc(tone)}">
    <p class="eyebrow"><span class="mono">Case closed</span> — ${esc(view.mystery?.summary.title ?? '')}</p>
    <h1 class="display verdict">${esc(ending?.title ?? 'The End')}</h1>
    <div class="story">${(ending?.narration ?? []).map(l => (l === '' ? '<br/>' : `<p>${esc(l)}</p>`)).join('')}</div>
    <dl class="ledger">
      <div><dt>Score</dt><dd class="mono strong">${state.score}</dd></div>
      <div><dt>Puzzles</dt><dd class="mono">${state.solvedPuzzleIds.length}/${view.mystery?.puzzles.length ?? 0}</dd></div>
      <div><dt>Clues</dt><dd class="mono">${state.discoveredClueIds.length}/${view.mystery?.clues.length ?? 0}</dd></div>
      <div><dt>Hints</dt><dd class="mono">${state.usedHintIds.length}</dd></div>
    </dl>
    <p class="muted">The host can start another game from the TV.</p>
    <button id="leave" class="secondary">Leave room</button>
  </section>`;
}

function endedScreen(view: RoomView): string {
  const why = {left: 'You left the room.', 'host-left': 'The host closed the room.', expired: 'The room expired.', removed: 'You were away too long and lost your seat.'}[view.ended!];
  return `<section class="state">
    <div class="glyph-ring" aria-hidden="true">■</div>
    <h2 class="state-title">Room closed</h2>
    <p class="muted">${why}</p>
    <div class="stack"><button id="again">Join another game</button></div>
  </section>`;
}

export type {RecoveryAction};
