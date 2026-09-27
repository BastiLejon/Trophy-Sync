/**
 * Einfache In-Memory-Drossel für Login-Versuche (pro Prozess).
 * Reicht für eine Einzel-Instanz; bei mehreren Instanzen wäre ein geteilter Speicher nötig.
 */
interface Entry {
  failures: number;
  blockedUntil: number;
}

const MAX_FAILURES = 5;
const BLOCK_MS = 15 * 60 * 1000;
const entries = new Map<string, Entry>();

export function isBlocked(key: string): number | null {
  const e = entries.get(key);
  if (!e) return null;
  if (e.blockedUntil > Date.now()) return e.blockedUntil;
  if (e.blockedUntil) entries.delete(key);
  return null;
}

export function recordFailure(key: string): void {
  const e = entries.get(key) ?? { failures: 0, blockedUntil: 0 };
  e.failures += 1;
  if (e.failures >= MAX_FAILURES) {
    e.blockedUntil = Date.now() + BLOCK_MS;
    e.failures = 0;
  }
  entries.set(key, e);
}

export function recordSuccess(key: string): void {
  entries.delete(key);
}
