/**
 * Assertion library for E2E testing framework
 */

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

export class AssertionError extends Error {
  constructor(message: string, public expected?: any, public actual?: any) {
    super(message);
    this.name = "AssertionError";
  }
}

export function expect<T = any>(actual: T) {
  const matchers = {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new AssertionError(
          `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`,
          expected,
          actual
        );
      }
    },

    toEqual(expected: any) {
      if (!deepEqual(actual, expected)) {
        throw new AssertionError(
          `Expected ${JSON.stringify(actual)} to deeply equal ${JSON.stringify(expected)}`,
          expected,
          actual
        );
      }
    },

    toBeTruthy() {
      if (!actual) {
        throw new AssertionError(`Expected truthy value, got ${JSON.stringify(actual)}`, true, actual);
      }
    },

    toBeFalsy() {
      if (actual) {
        throw new AssertionError(`Expected falsy value, got ${JSON.stringify(actual)}`, false, actual);
      }
    },

    toBeGreaterThan(expected: number) {
      if (typeof actual !== "number" || actual <= expected) {
        throw new AssertionError(`Expected ${actual} > ${expected}`, `> ${expected}`, actual);
      }
    },

    toBeGreaterThanOrEqual(expected: number) {
      if (typeof actual !== "number" || actual < expected) {
        throw new AssertionError(`Expected ${actual} >= ${expected}`, `>= ${expected}`, actual);
      }
    },

    toBeLessThan(expected: number) {
      if (typeof actual !== "number" || actual >= expected) {
        throw new AssertionError(`Expected ${actual} < ${expected}`, `< ${expected}`, actual);
      }
    },

    toBeLessThanOrEqual(expected: number) {
      if (typeof actual !== "number" || actual > expected) {
        throw new AssertionError(`Expected ${actual} <= ${expected}`, `<= ${expected}`, actual);
      }
    },

    toBeCloseTo(expected: number, delta = 0.001) {
      if (typeof actual !== "number" || Math.abs(actual - expected) > delta) {
        throw new AssertionError(`Expected ${actual} to be close to ${expected} (delta: ${delta})`, expected, actual);
      }
    },

    toContain(expectedItem: any) {
      if (typeof actual === "string") {
        if (!actual.includes(expectedItem)) {
          throw new AssertionError(`Expected string to contain "${expectedItem}", got "${actual}"`, expectedItem, actual);
        }
        return;
      }
      if (Array.isArray(actual)) {
        const found = actual.some(item => deepEqual(item, expectedItem) || item === expectedItem);
        if (!found) {
          throw new AssertionError(`Expected array to contain ${JSON.stringify(expectedItem)}`, expectedItem, actual);
        }
        return;
      }
      throw new AssertionError(`toContain only supports string or array, got ${typeof actual}`);
    },

    toMatch(pattern: RegExp | string) {
      const reg = typeof pattern === "string" ? new RegExp(pattern) : pattern;
      if (typeof actual !== "string" || !reg.test(actual)) {
        throw new AssertionError(`Expected "${actual}" to match pattern ${pattern}`, pattern, actual);
      }
    },

    toBeDefined() {
      if (actual === undefined) {
        throw new AssertionError(`Expected value to be defined, got undefined`, "defined", actual);
      }
    },

    toBeUndefined() {
      if (actual !== undefined) {
        throw new AssertionError(`Expected value to be undefined, got ${JSON.stringify(actual)}`, undefined, actual);
      }
    },

    toBeNull() {
      if (actual !== null) {
        throw new AssertionError(`Expected null, got ${JSON.stringify(actual)}`, null, actual);
      }
    },

    toThrow(expectedMessage?: string | RegExp) {
      if (typeof actual !== "function") {
        throw new AssertionError(`Expected a function to test for throwing error`);
      }
      let threw = false;
      let error: any = null;
      try {
        actual();
      } catch (err: any) {
        threw = true;
        error = err;
      }
      if (!threw) {
        throw new AssertionError(`Expected function to throw, but it did not`);
      }
      if (expectedMessage) {
        const message = error?.message || String(error);
        if (typeof expectedMessage === "string" && !message.includes(expectedMessage)) {
          throw new AssertionError(`Expected error message to contain "${expectedMessage}", got "${message}"`);
        }
        if (expectedMessage instanceof RegExp && !expectedMessage.test(message)) {
          throw new AssertionError(`Expected error message to match ${expectedMessage}, got "${message}"`);
        }
      }
    },
  };

  const notMatchers = {
    toBe(expected: any) {
      if (actual === expected) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} NOT to be ${JSON.stringify(expected)}`, expected, actual);
      }
    },
    toEqual(expected: any) {
      if (deepEqual(actual, expected)) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} NOT to deeply equal ${JSON.stringify(expected)}`, expected, actual);
      }
    },
    toBeTruthy() {
      if (actual) {
        throw new AssertionError(`Expected truthy value NOT to be true, got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (!actual) {
        throw new AssertionError(`Expected falsy value NOT to be false, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(expectedItem: any) {
      if (typeof actual === "string") {
        if (actual.includes(expectedItem)) {
          throw new AssertionError(`Expected string NOT to contain "${expectedItem}", but it did`, expectedItem, actual);
        }
        return;
      }
      if (Array.isArray(actual)) {
        const found = actual.some(item => deepEqual(item, expectedItem) || item === expectedItem);
        if (found) {
          throw new AssertionError(`Expected array NOT to contain ${JSON.stringify(expectedItem)}, but it did`, expectedItem, actual);
        }
        return;
      }
      throw new AssertionError(`toContain only supports string or array, got ${typeof actual}`);
    },
    toMatch(pattern: RegExp | string) {
      const reg = typeof pattern === "string" ? new RegExp(pattern) : pattern;
      if (typeof actual === "string" && reg.test(actual)) {
        throw new AssertionError(`Expected "${actual}" NOT to match pattern ${pattern}`);
      }
    },
    toBeDefined() {
      if (actual !== undefined) {
        throw new AssertionError(`Expected value NOT to be defined, got ${JSON.stringify(actual)}`);
      }
    },
    toBeUndefined() {
      if (actual === undefined) {
        throw new AssertionError(`Expected value NOT to be undefined, got undefined`);
      }
    },
    toBeNull() {
      if (actual === null) {
        throw new AssertionError(`Expected value NOT to be null`);
      }
    },
  };

  return {
    ...matchers,
    not: notMatchers,
  };
}
