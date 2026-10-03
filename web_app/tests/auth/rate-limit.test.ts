import { afterEach, describe, expect, it } from 'vitest';
import { clearAccountAttempts, consumeAccountAttempt, resetAccountAttemptsForTests } from '@/auth/rate-limit';

describe('account attempt throttling', () => {
  afterEach(() => resetAccountAttemptsForTests());

  it('bounds login and recovery attempts per normalized account within a time window', () => {
    const start = 1_000_000;
    for (let attempt = 0; attempt < 8; attempt++) expect(consumeAccountAttempt('login', 'Writer_1', start + attempt)).toBe(true);
    expect(consumeAccountAttempt('login', 'writer_1', start + 10)).toBe(false);
    expect(consumeAccountAttempt('recovery', 'writer_1', start + 10)).toBe(true);
    expect(consumeAccountAttempt('login', 'writer_1', start + 15 * 60 * 1000 + 1)).toBe(true);
  });

  it('clears the successful account attempt bucket', () => {
    const start = 2_000_000;
    for (let attempt = 0; attempt < 8; attempt++) consumeAccountAttempt('recovery', 'safe_name', start + attempt);
    clearAccountAttempts('recovery', 'SAFE_NAME');
    expect(consumeAccountAttempt('recovery', 'safe_name', start + 10)).toBe(true);
  });
});
