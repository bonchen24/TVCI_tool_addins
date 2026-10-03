/**
 * E2E Testing Framework Types
 * Lightweight, zero-dependency test runner contracts
 */

export type TestFn = () => void | Promise<void>;

export interface TestCase {
  id: string;
  name: string;
  fn: TestFn;
  durationMs?: number;
  error?: Error;
  status: "pending" | "passed" | "failed" | "skipped";
}

export interface TestSuite {
  name: string;
  tier: 1 | 2 | 3 | 4;
  featureId?: number;
  cases: TestCase[];
  filePath?: string;
}

export interface TestRunResult {
  totalSuites: number;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  skippedCases: number;
  durationMs: number;
  failures: Array<{
    suiteName: string;
    testName: string;
    error: Error;
  }>;
}

export interface RunnerOptions {
  tier?: number;
  filter?: string;
  bail?: boolean;
  verbose?: boolean;
}
