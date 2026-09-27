/**
 * Deterministic answer validation (Master Brief §11).
 * Normalisation only forgives harmless differences: case, surrounding
 * whitespace, repeated inner whitespace and Unicode compatibility forms.
 * Per-type validators (numeric, code, sequence, combination, evidence…) arrive in Phase 2.
 */
export function normalizeText(raw: string): string {
  return raw.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}
