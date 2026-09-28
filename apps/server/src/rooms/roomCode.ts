import {randomInt} from 'node:crypto';

/**
 * Room codes: 4 digits. Digits are easy to read out across a living room,
 * have no look-alike characters (O/0, I/1) and fit a phone's number pad.
 * Codes that look like a pattern (1111, 1234) are skipped.
 */
export const ROOM_CODE_LENGTH = 4;
const ROOM_CODE = /^\d{4}$/;

export function isValidRoomCodeFormat(code: string): boolean {
  return ROOM_CODE.test(code);
}

/** Accepts "48 27", "4827 " etc. from a phone keyboard. */
export function normalizeRoomCode(raw: string): string {
  return raw.replace(/\s+/g, '');
}

export function generateRoomCode(
  isTaken: (code: string) => boolean,
  random: (max: number) => number = randomInt,
): string {
  for (let attempt = 0; attempt < 200; attempt++) {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += String(random(10));
    if (!isBoring(code) && !isTaken(code)) return code;
  }
  throw new Error('No free room code');
}

function isBoring(code: string): boolean {
  if (/^(\d)\1+$/.test(code)) return true;
  const digits = [...code].map(Number);
  const step = (digits[1] ?? 0) - (digits[0] ?? 0);
  return Math.abs(step) === 1 && digits.every((d, i) => i === 0 || d - (digits[i - 1] ?? 0) === step);
}
