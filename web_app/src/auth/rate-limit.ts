const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const attempts = new Map<string, { count: number; startedAt: number }>();

/** Process-local username throttling; no IP or User-Agent is retained. */
export function consumeAccountAttempt(kind: 'login' | 'recovery', username: string, now = Date.now()): boolean {
  const key = `${kind}:${username.trim().toLocaleLowerCase('en-US')}`;
  const current = attempts.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    attempts.set(key, { count: 1, startedAt: now });
    return true;
  }
  if (current.count >= MAX_ATTEMPTS) return false;
  current.count += 1;
  return true;
}

export function clearAccountAttempts(kind: 'login' | 'recovery', username: string): void {
  attempts.delete(`${kind}:${username.trim().toLocaleLowerCase('en-US')}`);
}

export function resetAccountAttemptsForTests(): void {
  attempts.clear();
}
