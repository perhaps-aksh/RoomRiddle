/**
 * RoomRiddle phone companion: Phase 4 functional flow.
 *
 *   Join (code + name) → Joining → Lobby/Waiting → Game → Ending
 *   plus Reconnecting and Error states.
 *
 * The phone only sends intents and renders the server's room snapshot.
 * It never decides correctness, score, unlocks or progression. Plain DOM on
 * purpose: the phone UI stack and design are Phase 5.
 */
import {
  RoomClient,
  errorText,
  initialRoomView,
  me,
  reduceRoomView,
  serverNow,
  withConnection,
  type RoomView,
  type SessionStore,
} from '@roomriddle/client';
import {formatClock, isRequirementMet, remainingMs} from '@roomriddle/game-engine';
import type {ClientMessage, PublicPuzzle, SessionInfo} from '@roomriddle/shared-types';
import {esc} from './html';

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
/** Local-only UI state: what the player is typing/selecting. Never game truth. */
const ui = {
  code: codeFromUrl(),
  name: localStorage.getItem(NAME_KEY) ?? '',
  joining: false,
  tab: 'scene' as 'scene' | 'evidence',
  openPuzzleId: null as string | null,
  drafts: {} as Record<string, string>,
  selections: {} as Record<string, string[]>,
  pendingRequest: null as string | null,
  feedback: null as {kind: 'ok' | 'bad' | 'info'; text: string} | null,
};

client.onMessage(message => {
  view = reduceRoomView(view, message);
  if (message.type === 'ERROR') {
    ui.joining = false;
    ui.feedback = {kind: 'bad', text: errorText(message.code)};
  }
  if (message.type === 'ROOM_JOINED' || message.type === 'RECONNECT_SUCCESS') {
    ui.joining = false;
    ui.feedback = null;
    history.replaceState(null, '', `/join/${message.room.code}`);
  }
  if (message.type === 'GAME_STARTED') {
    ui.openPuzzleId = null;
    ui.feedback = null;
    ui.drafts = {};
    ui.selections = {};
  }
  if (message.type === 'GAME_STATE_UPDATED') {
    ui.feedback = feedbackFor(message.update, message.requestId === ui.pendingRequest);
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
  if (clock && state) clock.textContent = formatClock(remainingMs(state, serverNow(view)) ?? 0);
}, 1000);

function send(message: ClientMessage): void {
  ui.pendingRequest = client.send(message);
}

function codeFromUrl(): string {
  const match = /^\/join\/(\d{4})\/?$/.exec(location.pathname);
  return match?.[1] ?? '';
}

// ─── Rendering ────────────────────────────────────────────────────────

function render(): void {
  const focusedId = document.activeElement?.id ?? null;
  root.innerHTML = screen();
  bind();
  if (focusedId) {
    const el = document.getElementById(focusedId) as HTMLInputElement | null;
    if (el) {
      el.focus();
      if (el.setSelectionRange && el.value !== undefined) el.setSelectionRange(el.value.length, el.value.length);
    }
  }
}

function screen(): string {
  if (view.ended) return endedScreen();
  if (view.session && !view.room) {
    return view.connection === 'open' && view.error ? errorScreen() : `${header()}<h2>Reconnecting…</h2><p class="muted">Getting you back into room ${esc(view.session.roomCode)}.</p>`;
  }
  if (!view.room) return joinScreen();
  const state = view.room.gameState;
  if (!state || view.room.status === 'lobby') return lobbyScreen();
  if (state.status === 'completed') return endingScreen();
  return gameScreen();
}

function header(): string {
  const c = view.connection;
  const pill =
    c === 'open' ? '<span class="pill ok">✓ Connected</span>'
    : c === 'reconnecting' ? '<span class="pill bad">Reconnecting…</span>'
    : c === 'connecting' ? '<span class="pill">Connecting…</span>'
    : c === 'closed' ? '<span class="pill bad">Offline</span>'
    : '';
  const room = view.room ? `<span class="faint">Room ${esc(view.room.code)}</span>` : '';
  return `<div class="bar"><h1>ROOMRIDDLE</h1>${room}${pill}</div>`;
}

function joinScreen(): string {
  return `${header()}
    <h2>Join a game</h2>
    <form id="join-form" autocomplete="off">
      <label for="code">Room code</label>
      <input id="code" class="code" inputmode="numeric" pattern="[0-9]*" maxlength="4" value="${esc(ui.code)}" placeholder="____" />
      <label for="name">Your name</label>
      <input id="name" maxlength="16" value="${esc(ui.name)}" placeholder="e.g. Aksh" autocapitalize="words" />
      <button id="join" type="submit" ${ui.joining ? 'disabled' : ''}>${ui.joining ? 'Joining…' : 'Join'}</button>
      <p class="error" role="alert">${ui.feedback?.kind === 'bad' ? esc(ui.feedback.text) : ''}</p>
    </form>
    <p class="faint">The code is on the TV. Scanning the TV's QR code fills it in.</p>`;
}

function lobbyScreen(): string {
  const room = view.room!;
  const self = me(view);
  const players = room.players.filter(p => p.role === 'player');
  const hostOnline = room.players.find(p => p.role === 'host')?.connected ?? false;
  return `${header()}
    <p class="muted">JOINED</p>
    <h2>${esc(view.mystery?.summary.title ?? 'RoomRiddle')}</h2>
    <p>You are: <strong>${esc(self?.name.toUpperCase() ?? '')}</strong></p>
    <div class="notice">${hostOnline ? 'Waiting for the host to start…' : 'The TV is offline. Waiting for it to come back…'}</div>
    <h3>Players (${players.length}/${room.maxPlayers})</h3>
    <ul class="players">${players
      .map(p => `<li><span>${esc(p.name)}${p.id === self?.id ? ' (you)' : ''}</span><span class="${p.connected ? 'muted' : 'error'}">${p.connected ? (p.ready ? 'ready' : 'here') : 'offline'}</span></li>`)
      .join('')}</ul>
    <p class="faint">At least ${room.minPlayers} players are needed to start.</p>
    <button id="ready" class="secondary">${self?.ready ? 'Not ready' : "I'm ready"}</button>
    <button id="leave" class="secondary">Leave room</button>`;
}

function gameScreen(): string {
  const room = view.room!;
  const state = room.gameState!;
  const mystery = view.mystery;
  if (!mystery) return `${header()}<p>Loading the mystery…</p>`;
  const scene = mystery.scenes.find(s => s.id === state.currentSceneId);
  const left = remainingMs(state, serverNow(view));
  const paused = state.status === 'paused';
  const top = `${header()}
    <div class="bar"><span class="score">${state.score} pts</span>${left !== null ? `<span>⏱ <span id="clock">${formatClock(left)}</span></span>` : ''}</div>
    ${paused ? '<div class="notice bad">Paused: waiting for the TV to reconnect.</div>' : ''}
    ${ui.feedback ? `<div class="notice ${ui.feedback.kind === 'bad' ? 'bad' : ui.feedback.kind === 'ok' ? 'ok' : ''}">${esc(ui.feedback.text)}</div>` : ''}
    <div class="row"><button id="tab-scene" class="${ui.tab === 'scene' ? '' : 'secondary'}">Scene</button><button id="tab-evidence" class="${ui.tab === 'evidence' ? '' : 'secondary'}">Evidence (${state.discoveredClueIds.length})</button></div>`;
  if (ui.tab === 'evidence') return top + evidenceList();
  if (!scene) return top;
  const puzzle = ui.openPuzzleId ? mystery.puzzles.find(p => p.id === ui.openPuzzleId) : undefined;
  if (puzzle && !state.solvedPuzzleIds.includes(puzzle.id)) return top + puzzleView(puzzle);

  const clues = scene.clueIds
    .map(id => mystery.clues.find(c => c.id === id)!)
    .filter(c => c && (state.discoveredClueIds.includes(c.id) || isRequirementMet(c.requires, state)));
  const puzzles = scene.puzzleIds.map(id => mystery.puzzles.find(p => p.id === id)!).filter(Boolean);
  const complete = puzzles.every(p => state.solvedPuzzleIds.includes(p.id));
  const isFinal = !scene.nextSceneId;
  return `${top}
    <p class="faint">${esc((scene.subtitle ?? '').toUpperCase())}</p>
    <h2>${esc(scene.title)}</h2>
    <h3>Investigate</h3>
    ${clues
      .map(c => {
        const found = state.discoveredClueIds.includes(c.id);
        const text = room.reveals?.clues[c.id] ?? [];
        return found
          ? `<div class="card found"><h4>✓ ${esc(c.title)}</h4>${text.map(l => `<p class="muted">${esc(l)}</p>`).join('')}</div>`
          : `<button class="option" data-clue="${esc(c.id)}" ${paused ? 'disabled' : ''}>🔍 ${esc(c.prompt)}</button>`;
      })
      .join('')}
    <h3>Puzzle</h3>
    ${puzzles
      .map(p => {
        const solved = state.solvedPuzzleIds.includes(p.id);
        const unlocked = state.unlockedPuzzleIds.includes(p.id);
        if (solved) {
          const text = room.reveals?.solvedText[p.id] ?? [];
          return `<div class="card found"><h4>✓ ${esc(p.title)} (+${state.puzzlePoints[p.id] ?? 0})</h4>${text.map(l => `<p class="muted">${esc(l)}</p>`).join('')}</div>`;
        }
        return unlocked
          ? `<button data-open="${esc(p.id)}" ${paused ? 'disabled' : ''}>Solve: ${esc(p.title)}</button>`
          : `<div class="card"><h4>🔒 ${esc(p.title)}</h4><p class="faint">Keep investigating to unlock it.</p></div>`;
      })
      .join('')}
    ${complete ? `<button id="advance" ${paused ? 'disabled' : ''}>${isFinal ? 'Finish the mystery' : 'Continue to the next scene'}</button>` : ''}`;
}

function puzzleView(puzzle: PublicPuzzle): string {
  const state = view.room!.gameState!;
  const reveals = view.room!.reveals;
  const revealed = puzzle.hintIds.flatMap(id => (reveals?.hints[id] !== undefined ? [[id, reveals.hints[id]!] as const] : []));
  const input = puzzle.input;
  let field = '';
  if (input.kind === 'digits' || input.kind === 'text') {
    field = `<label for="answer">Your answer</label>
      <input id="answer" ${input.kind === 'digits' ? `inputmode="numeric" maxlength="${input.length + 2}" class="code"` : ''} value="${esc(ui.drafts[puzzle.id] ?? '')}" />`;
  } else if (input.kind === 'choice') {
    const selected = ui.selections[puzzle.id]?.[0];
    field = input.options.map(o => `<button class="option ${selected === o.id ? 'selected' : ''}" data-select="0" data-value="${esc(o.id)}">${selected === o.id ? '● ' : '○ '}${esc(o.label)}</button>`).join('');
  } else {
    field = input.fields
      .map((f, i) => {
        const selected = ui.selections[puzzle.id]?.[i];
        return `<label>${esc(f.label)}</label><div class="grid">${f.options
          .map(o => `<button class="option ${selected === o.id ? 'selected' : ''}" data-select="${i}" data-value="${esc(o.id)}">${esc(o.label)}</button>`)
          .join('')}</div>`;
      })
      .join('');
  }
  return `
    <h2>${esc(puzzle.title)}</h2>
    ${puzzle.prompt.map(l => (l === '' ? '<br/>' : `<p class="muted">${esc(l)}</p>`)).join('')}
    <p><strong>${esc(puzzle.question)}</strong></p>
    ${revealed.map(([, text], i) => `<div class="card"><h4>Hint ${i + 1}</h4><p>${esc(text)}</p></div>`).join('')}
    ${field}
    <button id="submit">Submit answer</button>
    <div class="row">
      <button id="hint" class="secondary" ${revealed.length >= puzzle.hintCount ? 'disabled' : ''}>Hint (${revealed.length}/${puzzle.hintCount})</button>
      <button id="back" class="secondary">Back</button>
    </div>
    <p class="faint">${state.incorrectAttempts[puzzle.id] ? `Wrong answers so far: ${state.incorrectAttempts[puzzle.id]}` : ''}</p>`;
}

function evidenceList(): string {
  const state = view.room!.gameState!;
  const mystery = view.mystery!;
  if (state.discoveredClueIds.length === 0) return '<p class="muted">Nothing found yet. Investigate the scene.</p>';
  return state.discoveredClueIds
    .map(id => {
      const clue = mystery.clues.find(c => c.id === id);
      const text = view.room!.reveals?.clues[id] ?? [];
      return `<div class="card found"><h4>${esc(clue?.title ?? id)}</h4>${text.map(l => `<p class="muted">${esc(l)}</p>`).join('')}</div>`;
    })
    .join('');
}

function endingScreen(): string {
  const room = view.room!;
  const state = room.gameState!;
  const ending = room.reveals?.ending;
  return `${header()}
    <p class="muted">${esc(view.mystery?.summary.title.toUpperCase() ?? '')} · ENDING</p>
    <h2>${esc(ending?.title ?? 'The End')}</h2>
    ${(ending?.narration ?? []).map(l => (l === '' ? '<br/>' : `<p>${esc(l)}</p>`)).join('')}
    <div class="card"><p class="score">${state.score} points</p>
    <p class="muted">Puzzles ${state.solvedPuzzleIds.length}/${view.mystery?.puzzles.length ?? 0} · Clues ${state.discoveredClueIds.length}/${view.mystery?.clues.length ?? 0} · Hints ${state.usedHintIds.length}</p></div>
    <p class="faint">The host can start another game from the TV.</p>
    <button id="leave" class="secondary">Leave room</button>`;
}

function endedScreen(): string {
  const why = {left: 'You left the room.', 'host-left': 'The host closed the room.', expired: 'The room expired.', removed: 'You were away too long and lost your seat.'}[view.ended!];
  return `${header()}<h2>Room ended</h2><p class="muted">${why}</p><button id="again">Join another game</button>`;
}

function errorScreen(): string {
  return `${header()}<h2>Could not rejoin</h2><p class="error">${esc(errorText(view.error!.code))}</p><button id="again">Join a game</button>`;
}

// ─── Events ───────────────────────────────────────────────────────────

function bind(): void {
  on('join-form', 'submit', e => {
    e.preventDefault();
    const code = (document.getElementById('code') as HTMLInputElement).value.replace(/\D/g, '');
    const name = (document.getElementById('name') as HTMLInputElement).value.trim();
    ui.code = code;
    ui.name = name;
    if (code.length !== 4) return fail('INVALID_ROOM_CODE');
    if (!name) return fail('NAME_REQUIRED');
    localStorage.setItem(NAME_KEY, name);
    ui.joining = true;
    ui.feedback = null;
    client.forgetSession();
    send({type: 'JOIN_ROOM', roomCode: code, playerName: name});
    render();
  });
  input('code', v => (ui.code = v.replace(/\D/g, '').slice(0, 4)));
  input('name', v => (ui.name = v));
  input('answer', v => {
    if (ui.openPuzzleId) ui.drafts[ui.openPuzzleId] = v;
  });
  click('ready', () => send({type: 'READY', ready: !me(view)?.ready}));
  click('leave', () => send({type: 'LEAVE_ROOM'}));
  click('again', () => {
    view = {...initialRoomView, connection: view.connection};
    client.forgetSession();
    ui.feedback = null;
    render();
  });
  click('tab-scene', () => {
    ui.tab = 'scene';
    render();
  });
  click('tab-evidence', () => {
    ui.tab = 'evidence';
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
  root.querySelectorAll<HTMLButtonElement>('[data-clue]').forEach(b =>
    b.addEventListener('click', () => send({type: 'DISCOVER_CLUE', clueId: b.dataset.clue!})),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-open]').forEach(b =>
    b.addEventListener('click', () => {
      ui.openPuzzleId = b.dataset.open!;
      ui.feedback = null;
      render();
    }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-select]').forEach(b =>
    b.addEventListener('click', () => {
      const id = ui.openPuzzleId!;
      const list = [...(ui.selections[id] ?? [])];
      list[Number(b.dataset.select)] = b.dataset.value!;
      ui.selections[id] = list;
      render();
    }),
  );
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

function feedbackFor(update: NonNullable<RoomView['lastUpdate']>, mine: boolean): typeof ui.feedback {
  const who = mine ? 'You' : update.actorName ?? 'Someone';
  for (const e of update.events) {
    const puzzleTitle = (id: string) => view.mystery?.puzzles.find(p => p.id === id)?.title ?? id;
    switch (e.type) {
      case 'answer-correct':
        if (ui.openPuzzleId === e.puzzleId) ui.openPuzzleId = null;
        return {kind: 'ok', text: `${who} solved ${puzzleTitle(e.puzzleId)}! +${e.breakdown.awarded}`};
      case 'answer-incorrect':
        return {kind: 'bad', text: `${who} tried a wrong answer on ${puzzleTitle(e.puzzleId)}. −${e.penalty}`};
      case 'hint-revealed':
        return {kind: 'info', text: `${who} revealed hint ${e.hintNumber} for ${puzzleTitle(e.puzzleId)}.`};
      case 'clue-discovered':
        return {kind: 'info', text: `${who} found ${view.mystery?.clues.find(c => c.id === e.clueId)?.title ?? 'a clue'}.`};
      case 'scene-entered':
        ui.openPuzzleId = null;
        ui.tab = 'scene';
        return {kind: 'info', text: `New scene: ${view.mystery?.scenes.find(s => s.id === e.sceneId)?.title ?? ''}`};
      default:
        break;
    }
  }
  if (update.cause === 'HOST_RECONNECTED') return {kind: 'ok', text: 'The TV is back. Carry on!'};
  return ui.feedback;
}

function fail(code: Parameters<typeof errorText>[0]): void {
  ui.feedback = {kind: 'bad', text: errorText(code)};
  render();
}

function on(id: string, event: string, handler: (e: Event) => void): void {
  document.getElementById(id)?.addEventListener(event, handler);
}
function click(id: string, handler: () => void): void {
  on(id, 'click', handler);
}
function input(id: string, handler: (value: string) => void): void {
  on(id, 'input', e => handler((e.target as HTMLInputElement).value));
}
