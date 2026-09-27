/**
 * PLACEHOLDER room for the Phase 2 TV shell. No networking: the code is static and
 * nobody can actually join. Real rooms come from the server in the multiplayer phase.
 */
export interface MockRoom {
  code: string;
  playerCount: number;
}

export const MOCK_ROOM: MockRoom = {
  code: '4827',
  playerCount: 0,
};

export const ROOM_CODE_LENGTH = 4;
