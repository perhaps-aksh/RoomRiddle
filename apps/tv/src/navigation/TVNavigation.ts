/**
 * Minimal stack navigation for the TV shell. No navigation library: the shell has six
 * screens and one level of nesting, so a pure reducer is enough and easy to test.
 *
 *   home
 *    ├── createRoom
 *    ├── joinRoom
 *    ├── mysteries
 *    │     └── mysteryDetails
 *    └── settings
 *
 * Each stack entry remembers which control was focused when the user left it
 * (`focusKey`), so Back returns focus to the item that opened the next screen.
 */
import {createContext} from 'react';

export type Route =
  | {name: 'home'}
  | {name: 'createRoom'}
  | {name: 'joinRoom'}
  | {name: 'mysteries'}
  | {name: 'mysteryDetails'; mysteryId: string}
  | {name: 'settings'};

export type RouteName = Route['name'];

export interface StackEntry {
  route: Route;
  /** Key of the control to focus when this entry becomes visible again. */
  focusKey?: string;
}

export type NavigationStack = readonly StackEntry[];

export type NavigationAction =
  | {type: 'push'; route: Route; fromFocusKey?: string}
  | {type: 'pop'}
  | {type: 'reset'};

export interface Navigator {
  /** Open a screen. `fromFocusKey` is the control to refocus when coming back. */
  push(route: Route, fromFocusKey?: string): void;
  /** Return to the previous screen (no-op on Home). */
  back(): void;
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
    case 'reset':
      return createInitialStack();
  }
}

export function currentEntry(stack: NavigationStack): StackEntry {
  return stack[stack.length - 1];
}

export function canGoBack(stack: NavigationStack): boolean {
  return stack.length > 1;
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
