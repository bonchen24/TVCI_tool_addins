/**
 * Test Harness for E2E Test Execution
 */

import { TestCase, TestSuite, TestRunResult, RunnerOptions } from "./types";
import { expect } from "./assertions";

const registeredSuites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;

export function describe(name: string, tier: 1 | 2 | 3 | 4, fn: () => void, featureId?: number) {
  const suite: TestSuite = {
    name,
    tier,
    featureId,
    cases: [],
  };
  registeredSuites.push(suite);
  currentSuite = suite;
  fn();
  currentSuite = null;
}

export function it(name: string, fn: () => void | Promise<void>) {
  if (!currentSuite) {
    throw new Error(`Test "${name}" must be placed within a describe() block`);
  }
  const testCase: TestCase = {
    id: `${currentSuite.name} > ${name}`,
    name,
    fn,
    status: "pending",
  };
  currentSuite.cases.push(testCase);
}

export function getRegisteredSuites(): TestSuite[] {
  return registeredSuites;
}

export function clearRegisteredSuites(): void {
  registeredSuites.length = 0;
}

export async function runSuite(suite: TestSuite, options: RunnerOptions = {}): Promise<TestCase[]> {
  for (const testCase of suite.cases) {
    const startTime = Date.now();
    try {
      await testCase.fn();
      testCase.status = "passed";
    } catch (err: any) {
      testCase.status = "failed";
      testCase.error = err;
      if (options.bail) break;
    } finally {
      testCase.durationMs = Date.now() - startTime;
    }
  }
  return suite.cases;
}

export async function runAllSuites(options: RunnerOptions = {}): Promise<TestRunResult> {
  const result: TestRunResult = {
    totalSuites: 0,
    totalCases: 0,
    passedCases: 0,
    failedCases: 0,
    skippedCases: 0,
    durationMs: 0,
    failures: [],
  };

  const startAll = Date.now();

  let suitesToRun = registeredSuites;
  if (options.tier !== undefined) {
    suitesToRun = suitesToRun.filter((s) => s.tier === options.tier);
  }
  if (options.filter) {
    const filterLower = options.filter.toLowerCase();
    suitesToRun = suitesToRun.filter((s) =>
      s.name.toLowerCase().includes(filterLower)
    );
  }

  result.totalSuites = suitesToRun.length;

  for (const suite of suitesToRun) {
    await runSuite(suite, options);
    for (const testCase of suite.cases) {
      result.totalCases++;
      if (testCase.status === "passed") {
        result.passedCases++;
      } else if (testCase.status === "failed") {
        result.failedCases++;
        result.failures.push({
          suiteName: suite.name,
          testName: testCase.name,
          error: testCase.error || new Error("Unknown error"),
        });
      } else {
        result.skippedCases++;
      }
    }
    if (options.bail && result.failedCases > 0) {
      break;
    }
  }

  result.durationMs = Date.now() - startAll;
  return result;
}

export { expect };
