/**
 * RoomRiddle phone companion: wiring and events.
 *
 *   Join (code + name) → Joining → Lobby → Game → Ending
 *   plus Reconnecting, Rejoin error and Room closed.
 *
 * The phone only sends intents and renders the server's room snapshot. It
 * never decides correctness, score, unlocks or progression. Screens are pure
 * functions in render.ts; this file keeps state and turns taps into intents.
 */
import {
  RoomClient,
  errorExperience,
  initialRoomView,
  me,
  reduceRoomView,
  serverNow,
  withConnection,
  type RoomView,
  type SessionStore,
} from '@roomriddle/client';
import {formatClock, remainingMs} from '@roomriddle/game-engine';
import type {ClientMessage, ErrorCode, PublicPuzzle, SessionInfo} from '@roomriddle/shared-types';
import {initialUi, renderScreen, screenName, type Feedback, type RecoveryAction} from './render';

// ─── Wiring ───────────────────────────────────────────────────────────

const SESSION_KEY = 'roomriddle.session';
const NAME_KEY = 'roomriddle.name';

const store: SessionStore = {
  load: () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as SessionInfo) : null;
    } catch {
      return null;
    }
  },
  save: session => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  },
};

const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
const client = new RoomClient({url: wsUrl, store});
const root = document.getElementById('app')!;

let view: RoomView = {...initialRoomView, session: store.load()};
const ui = initialUi(codeFromUrl(), localStorage.getItem(NAME_KEY) ?? '');
let lastScreen = '';
let feedbackTimer: ReturnType<typeof setTimeout> | undefined;

client.onMessage(message => {
  view = reduceRoomView(view, message);
  if (message.type === 'ERROR') {
    const x = errorExperience(message.code);
    if (ui.joining || !view.room) {
      // The join was refused: explain it on the form, next to the field to fix.
      ui.joining = false;
      ui.formError = message.code;
    } else {
      say({kind: 'bad', title: titleCase(x.title), text: x.message});
    }
  }
  if (message.type === 'ROOM_JOINED' || message.type === 'RECONNECT_SUCCESS') {
    ui.joining = false;
    ui.formError = null;
    ui.feedback = null;
    history.replaceState(null, '', `/join/${message.room.code}`);
  }
  if (message.type === 'GAME_STARTED') {
    ui.suspectId = null;
    ui.evidenceId = null;
    ui.openPuzzleId = null;
    ui.feedback = null;
    ui.drafts = {};
    ui.selections = {};
  }
  if (message.type === 'CHARACTER_REPLY' && message.reply.askedBy !== null && ui.tab !== 'suspects') {
    say({kind: 'info', title: `${message.reply.characterName} answered`, text: `${message.reply.askedBy}: “${message.reply.question}”`}, false);
  }
  if (message.type === 'GAME_STATE_UPDATED') {
    const f = feedbackFor(message.update, message.requestId === ui.pendingRequest);
    if (f) say(f, false);
  }
  render();
});
client.onStatus(status => {
  view = withConnection(view, status);
  render();
});

// A stored session means we were in a room: resume it straight away.
if (view.session) client.connect();
render();
setInterval(() => {
  const clock = document.getElementById('clock');
  const state = view.room?.gameState;
  if (clock && state) {
    const left = remainingMs(state, serverNow(view)) ?? 0;
    clock.textContent = formatClock(left);
    clock.classList.toggle('warn', left < 5 * 60_000);
  }
}, 1000);

function send(message: ClientMessage): void {
  ui.pendingRequest = client.send(message);
}

function codeFromUrl(): string {
  const match = /^\/join\/(\d{4})\/?$/.exec(location.pathname);
  return match?.[1] ?? '';
}

/** Show a feedback toast for a few seconds (success, failure, hint, info). */
function say(f: Feedback, rerender = true): void {
  ui.feedback = f;
  ui.feedbackKey += 1;
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    ui.feedback = null;
    document.querySelector('.toast')?.classList.add('out');
  }, 4200);
  if (rerender) render();
}

// ─── Rendering ────────────────────────────────────────────────────────

function render(): void {
  const focusedId = document.activeElement?.id ?? null;
  const scrollY = window.scrollY;
  const name = screenName(view, ui);
  root.innerHTML = renderScreen(view, ui);
  // Screen changes play the entrance animation and start at the top;
  // re-renders within a screen keep scroll and focus where they were.
  const key = name + ui.tab + (ui.openPuzzleId ?? '') + (ui.suspectId ?? '');
  const changed = key !== lastScreen;
  lastScreen = key;
  root.querySelector('.screen')?.classList.toggle('enter', changed);
  if (changed) window.scrollTo(0, 0);
  else window.scrollTo(0, scrollY);
  bind();
  if (focusedId) {
    const el = document.getElementById(focusedId) as HTMLInputElement | null;
    if (el) {
      el.focus({preventScroll: true});
      if (el.setSelectionRange && typeof el.value === 'string') el.setSelectionRange(el.value.length, el.value.length);
    }
  }
}

// ─── Events ───────────────────────────────────────────────────────────

function bind(): void {
  on('join-form', 'submit', e => {
    e.preventDefault();
    const code = (document.getElementById('code') as HTMLInputElement).value.replace(/\D/g, '');
    const name = (document.getElementById('name') as HTMLInputElement).value.trim();
    ui.code = code;
    ui.name = name;
    if (code.length !== 4) return formFail('INVALID_ROOM_CODE');
    if (!name) return formFail('NAME_REQUIRED');
    localStorage.setItem(NAME_KEY, name);
    ui.joining = true;
    ui.formError = null;
    client.forgetSession();
    send({type: 'JOIN_ROOM', roomCode: code, playerName: name});
    render();
  });
  on('code', 'input', e => {
    const el = e.target as HTMLInputElement;
    ui.code = el.value.replace(/\D/g, '').slice(0, 4);
    if (el.value !== ui.code) el.value = ui.code;
    if (ui.formError) ui.formError = null;
    // Update the visual slots in place (a full render would fight the keyboard).
    document.querySelectorAll('.code-slots span').forEach((s, i) => {
      s.textContent = ui.code[i] ?? '';
      s.className = ui.code[i] ? 'filled' : i === ui.code.length ? 'active' : '';
    });
    document.querySelector('.code-field')?.classList.remove('invalid');
    if (ui.code.length === 4 && !ui.name) document.getElementById('name')?.focus();
  });
  on('name', 'input', e => {
    ui.name = (e.target as HTMLInputElement).value;
  });
  on('answer', 'input', e => {
    if (ui.openPuzzleId) ui.drafts[ui.openPuzzleId] = (e.target as HTMLInputElement).value;
  });
  click('ready', () => send({type: 'READY', ready: !me(view)?.ready}));
  click('leave', () => send({type: 'LEAVE_ROOM'}));
  click('again', resetToJoin);
  click('tab-scene', () => {
    ui.tab = 'scene';
    render();
  });
  click('tab-evidence', () => {
    ui.tab = 'evidence';
    render();
  });
  click('tab-suspects', () => {
    ui.tab = 'suspects';
    render();
  });
  click('suspects-back', () => {
    ui.suspectId = null;
    ui.evidenceId = null;
    render();
  });
  each('[data-suspect]', b =>
    b.addEventListener('click', () => {
      ui.suspectId = b.dataset.suspect!;
      ui.evidenceId = null;
      render();
    }),
  );
  on('question', 'input', e => {
    if (ui.suspectId) ui.drafts[`ask:${ui.suspectId}`] = (e.target as HTMLTextAreaElement).value;
  });
  on('evidence', 'change', e => {
    ui.evidenceId = (e.target as HTMLSelectElement).value || null;
  });
  on('ask-form', 'submit', e => {
    e.preventDefault();
    const id = ui.suspectId;
    const question = (ui.drafts[`ask:${id}`] ?? '').trim();
    if (!id || !question) return;
    send({type: 'ASK_CHARACTER', characterId: id, question, ...(ui.evidenceId ? {evidenceClueId: ui.evidenceId} : {})});
    ui.drafts[`ask:${id}`] = '';
    ui.evidenceId = null;
    render();
  });
  click('advance', () => send({type: 'ADVANCE_SCENE'}));
  click('back', () => {
    ui.openPuzzleId = null;
    render();
  });
  click('hint', () => ui.openPuzzleId && send({type: 'REQUEST_HINT', puzzleId: ui.openPuzzleId}));
  click('submit', () => {
    const puzzle = view.mystery?.puzzles.find(p => p.id === ui.openPuzzleId);
    if (!puzzle) return;
    send({type: 'SUBMIT_ANSWER', puzzleId: puzzle.id, answer: answerFor(puzzle)});
  });
  each('[data-clue]', b => b.addEventListener('click', () => {
    b.classList.add('pending');
    send({type: 'DISCOVER_CLUE', clueId: b.dataset.clue!});
  }));
  each('[data-open]', b =>
    b.addEventListener('click', () => {
      ui.openPuzzleId = b.dataset.open!;
      ui.feedback = null;
      render();
    }),
  );
  each('[data-select]', b =>
    b.addEventListener('click', () => {
      const id = ui.openPuzzleId!;
      const list = [...(ui.selections[id] ?? [])];
      list[Number(b.dataset.select)] = b.dataset.value!;
      ui.selections[id] = list;
      render();
    }),
  );
  each('[data-recover]', b => b.addEventListener('click', () => recover(b.dataset.recover as RecoveryAction)));
}

/** Every error offers a way forward; this wires each one. */
function recover(action: RecoveryAction): void {
  switch (action) {
    case 'retry':
    case 'reconnect':
      client.reconnectNow();
      return;
    case 'dismiss':
    case 'wait':
      view = {...view, error: null};
      render();
      return;
    default:
      resetToJoin();
  }
}

function resetToJoin(): void {
  view = {...initialRoomView, connection: view.connection};
  client.forgetSession();
  ui.feedback = null;
  ui.formError = null;
  ui.joining = false;
  history.replaceState(null, '', '/');
  render();
}

/** Entry → the engine's answer format. Correctness is the server's call. */
function answerFor(puzzle: PublicPuzzle): string {
  switch (puzzle.input.kind) {
    case 'digits':
    case 'text':
      return ui.drafts[puzzle.id] ?? '';
    case 'choice':
      return ui.selections[puzzle.id]?.[0] ?? '';
    case 'combination':
      return puzzle.input.fields.map((_, i) => ui.selections[puzzle.id]?.[i] ?? '').join('|');
  }
}

function feedbackFor(update: NonNullable<RoomView['lastUpdate']>, mine: boolean): Feedback | null {
  const who = mine ? 'You' : update.actorName ?? 'Someone';
  const puzzleTitle = (id: string) => view.mystery?.puzzles.find(p => p.id === id)?.title ?? id;
  for (const e of update.events) {
    switch (e.type) {
      case 'answer-correct':
        if (ui.openPuzzleId === e.puzzleId) ui.openPuzzleId = null;
        return {kind: 'ok', title: `${puzzleTitle(e.puzzleId)} solved`, text: `${who} cracked it. +${e.breakdown.awarded}`};
      case 'answer-incorrect':
        return {kind: 'bad', title: "That doesn't fit", text: `${who} tried a wrong answer on ${puzzleTitle(e.puzzleId)}. −${e.penalty}`};
      case 'hint-revealed':
        return {kind: 'hint', title: `Hint ${e.hintNumber} revealed`, text: `${who} asked for help on ${puzzleTitle(e.puzzleId)}. −${e.penalty}`};
      case 'clue-discovered':
        return {kind: 'info', title: 'Evidence found', text: `${who} found ${view.mystery?.clues.find(c => c.id === e.clueId)?.title ?? 'a clue'}.`};
      case 'scene-entered':
        ui.openPuzzleId = null;
        ui.tab = 'scene';
        return {kind: 'info', title: 'New scene', text: view.mystery?.scenes.find(s => s.id === e.sceneId)?.title ?? ''};
      default:
        break;
    }
  }
  if (update.cause === 'HOST_RECONNECTED') return {kind: 'ok', title: 'The TV is back', text: 'Carry on.'};
  if (update.cause === 'HOST_DISCONNECTED') return {kind: 'bad', title: 'TV offline', text: 'The game is paused until it reconnects.'};
  return null;
}

function formFail(code: ErrorCode): void {
  ui.formError = code;
  render();
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function on(id: string, event: string, handler: (e: Event) => void): void {
  document.getElementById(id)?.addEventListener(event, handler);
}
function click(id: string, handler: () => void): void {
  on(id, 'click', handler);
}
function each(selector: string, fn: (el: HTMLButtonElement) => void): void {
  root.querySelectorAll<HTMLButtonElement>(selector).forEach(fn);
}
