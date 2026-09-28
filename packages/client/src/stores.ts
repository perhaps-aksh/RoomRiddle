import type {SessionInfo} from '@roomriddle/shared-types';
import type {SessionStore} from './RoomClient';

/** In-memory session store (TV app, tests). Phones use localStorage. */
export function memorySessionStore(initial: SessionInfo | null = null): SessionStore {
  let session = initial;
  return {
    load: () => session,
    save: next => {
      session = next;
    },
  };
}
