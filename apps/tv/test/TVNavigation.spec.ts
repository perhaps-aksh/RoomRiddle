import {
  canGoBack,
  createInitialStack,
  currentEntry,
  navigationReducer,
} from '../src/navigation/TVNavigation';

describe('TV navigation reducer', () => {
  it('starts on Home and cannot go back from there', () => {
    const stack = createInitialStack();
    expect(currentEntry(stack).route).toEqual({name: 'home'});
    expect(canGoBack(stack)).toBe(false);
    expect(navigationReducer(stack, {type: 'pop'})).toBe(stack);
  });

  it('pushes a screen and remembers the focus key of the screen it came from', () => {
    const stack = navigationReducer(createInitialStack(), {
      type: 'push',
      route: {name: 'mysteries'},
      fromFocusKey: 'mysteries',
    });
    expect(currentEntry(stack).route).toEqual({name: 'mysteries'});
    expect(stack[0].focusKey).toBe('mysteries');
    expect(canGoBack(stack)).toBe(true);
  });

  it('goes Home → Mysteries → Details and back step by step, restoring focus', () => {
    let stack = createInitialStack();
    stack = navigationReducer(stack, {type: 'push', route: {name: 'mysteries'}, fromFocusKey: 'mysteries'});
    stack = navigationReducer(stack, {
      type: 'push',
      route: {name: 'mysteryDetails', mysteryId: 'signal-lost'},
      fromFocusKey: 'mystery-signal-lost',
    });
    expect(currentEntry(stack).route).toEqual({name: 'mysteryDetails', mysteryId: 'signal-lost'});

    stack = navigationReducer(stack, {type: 'pop'});
    expect(currentEntry(stack)).toEqual({route: {name: 'mysteries'}, focusKey: 'mystery-signal-lost'});

    stack = navigationReducer(stack, {type: 'pop'});
    expect(currentEntry(stack)).toEqual({route: {name: 'home'}, focusKey: 'mysteries'});
  });

  it('reset returns to a fresh Home', () => {
    let stack = navigationReducer(createInitialStack(), {type: 'push', route: {name: 'settings'}});
    stack = navigationReducer(stack, {type: 'reset'});
    expect(stack).toEqual(createInitialStack());
  });

  it('reset can stack screens above Home (e.g. Home → Ending)', () => {
    let stack = navigationReducer(createInitialStack(), {type: 'push', route: {name: 'scene'}});
    stack = navigationReducer(stack, {type: 'reset', routes: [{name: 'ending'}]});
    expect(stack.map(e => e.route.name)).toEqual(['home', 'ending']);
  });

  it('replace swaps the top screen without adding a Back step', () => {
    let stack = navigationReducer(createInitialStack(), {type: 'push', route: {name: 'gameIntro'}});
    stack = navigationReducer(stack, {type: 'replace', route: {name: 'scene'}});
    expect(stack.map(e => e.route.name)).toEqual(['home', 'scene']);
  });

  it('never mutates the previous stack', () => {
    const start = createInitialStack();
    const snapshot = JSON.stringify(start);
    navigationReducer(start, {type: 'push', route: {name: 'joinRoom'}, fromFocusKey: 'joinRoom'});
    expect(JSON.stringify(start)).toBe(snapshot);
  });
});
