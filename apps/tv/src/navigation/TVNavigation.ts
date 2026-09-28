/**
 * Minimal stack navigation for the TV app. No navigation library: a pure
 * reducer is enough and easy to test.
 *
 *   home
 *    ├── createRoom
 *    ├── joinRoom
 *    ├── mysteries
 *    │     └── mysteryDetails
 *    │            └── gameIntro → scene          (intro is replaced by the scene)
 *    │                             ├── investigation
 *    │                             ├── evidence
 *    │                             └── puzzle
 *    ├── ending                   (the game resets the stack to home → ending)
 *    └── settings
 *
 * Each stack entry remembers which control was focused when the user left it
 * (`focusKey`), so Back returns focus to the item that opened the next screen.
 * Game rules never live here: routes only say which screen is visible.
 */
import {createContext} from 'react';

export type Route =
  | {name: 'home'}
  | {name: 'createRoom'}
  | {name: 'joinRoom'}
  | {name: 'mysteries'}
  | {name: 'mysteryDetails'; mysteryId: string}
  | {name: 'settings'}
  | {name: 'gameIntro'}
  | {name: 'scene'}
  | {name: 'investigation'}
  | {name: 'evidence'}
  | {name: 'puzzle'; puzzleId: string}
  | {name: 'ending'};

export type RouteName = Route['name'];

/** Screens that belong to a running mystery. */
export const GAME_ROUTES: readonly RouteName[] = [
  'gameIntro',
  'scene',
  'investigation',
  'evidence',
  'puzzle',
  'ending',
];

export interface StackEntry {
  route: Route;
  /** Key of the control to focus when this entry becomes visible again. */
  focusKey?: string;
}

export type NavigationStack = readonly StackEntry[];

export type NavigationAction =
  | {type: 'push'; route: Route; fromFocusKey?: string}
  | {type: 'pop'}
  | {type: 'replace'; route: Route}
  /** Back to a fresh Home, optionally with more screens stacked on top. */
  | {type: 'reset'; routes?: readonly Route[]};

export interface Navigator {
  /** Open a screen. `fromFocusKey` is the control to refocus when coming back. */
  push(route: Route, fromFocusKey?: string): void;
  /** Return to the previous screen (no-op on Home). */
  back(): void;
  /** Swap the visible screen for another, without adding a Back step. */
  replace(route: Route): void;
  /** Start again from Home, optionally with `routes` stacked on top of it. */
  reset(routes?: readonly Route[]): void;
}

export function createInitialStack(): NavigationStack {
  return [{route: {name: 'home'}}];
}

export function navigationReducer(
  stack: NavigationStack,
  action: NavigationAction,
): NavigationStack {
  switch (action.type) {
    case 'push': {
      const top = stack[stack.length - 1];
      const updatedTop: StackEntry =
        action.fromFocusKey === undefined
          ? top
          : {...top, focusKey: action.fromFocusKey};
      return [...stack.slice(0, -1), updatedTop, {route: action.route}];
    }
    case 'pop':
      return stack.length > 1 ? stack.slice(0, -1) : stack;
    case 'replace':
      return [...stack.slice(0, -1), {route: action.route}];
    case 'reset':
      return [
        ...createInitialStack(),
        ...(action.routes ?? []).map(route => ({route})),
      ];
  }
}

export function currentEntry(stack: NavigationStack): StackEntry {
  return stack[stack.length - 1];
}

export function canGoBack(stack: NavigationStack): boolean {
  return stack.length > 1;
}

export function isGameRoute(route: Route): boolean {
  return GAME_ROUTES.includes(route.name);
}

/**
 * Lets the visible screen take over the remote's Back button (for example to ask
 * "Close this room?" instead of leaving). The handler returns true when it consumed
 * the press.
 */
export interface BackInterceptorRegistry {
  set(handler: (() => boolean) | null): void;
}

export const BackInterceptorContext = createContext<BackInterceptorRegistry>({
  set: () => {},
});
