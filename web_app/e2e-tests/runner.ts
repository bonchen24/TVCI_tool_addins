#!/usr/bin/env node
/**
 * Standalone E2E Test Runner CLI for TVCI Web Application
 * Usage:
 *   node runner.ts [--tier=1..4] [--filter=pattern] [--bail] [--json] [--verbose]
 */

import "./index";
import { runAllSuites, getRegisteredSuites } from "./framework/testHarness";
import { RunnerOptions } from "./framework/types";

async function main() {
  const args = process.argv.slice(2);
  const options: RunnerOptions = {};
  let outputJson = false;

  for (const arg of args) {
    if (arg.startsWith("--tier=")) {
      options.tier = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--filter=")) {
      options.filter = arg.split("=")[1];
    } else if (arg === "--bail") {
      options.bail = true;
    } else if (arg === "--verbose") {
      options.verbose = true;
    } else if (arg === "--json") {
      outputJson = true;
    }
  }

  const registeredSuites = getRegisteredSuites();
  if (!outputJson) {
    console.log("================================================================================");
    console.log(" TVCI Web Application — End-to-End (E2E) Test Runner");
    console.log(" Opaque-Box Requirement-Driven Verification Track");
    console.log("================================================================================");
    console.log(`Registered Suites: ${registeredSuites.length}`);
    if (options.tier) console.log(`Active Filter: Tier ${options.tier}`);
    if (options.filter) console.log(`Active Filter: Name contains "${options.filter}"`);
    console.log("--------------------------------------------------------------------------------\n");
  }

  const result = await runAllSuites(options);

  if (outputJson) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.failedCases > 0 ? 1 : 0);
  }

  // Console reporting
  for (const suite of registeredSuites) {
    if (options.tier && suite.tier !== options.tier) continue;
    if (options.filter && !suite.name.toLowerCase().includes(options.filter.toLowerCase())) continue;

    const allPassed = suite.cases.every((c) => c.status === "passed");
    const statusIcon = allPassed ? "✓" : "✗";
    console.log(`${statusIcon} [Tier ${suite.tier}] ${suite.name} (${suite.cases.length} tests)`);

    if (options.verbose || !allPassed) {
      for (const tc of suite.cases) {
        const tcIcon = tc.status === "passed" ? "  ✓" : "  ✗";
        console.log(`${tcIcon} ${tc.name} (${tc.durationMs || 0}ms)`);
        if (tc.error) {
          console.log(`     Error: ${tc.error.message}`);
        }
      }
    }
  }

  console.log("\n================================================================================");
  console.log(" Test Run Summary");
  console.log("================================================================================");
  console.log(` Suites Evaluated: ${result.totalSuites}`);
  console.log(` Total Test Cases: ${result.totalCases}`);
  console.log(` Passed Cases:     ${result.passedCases}`);
  console.log(` Failed Cases:     ${result.failedCases}`);
  console.log(` Skipped Cases:    ${result.skippedCases}`);
  console.log(` Total Duration:   ${result.durationMs}ms`);
  console.log("================================================================================");

  if (result.failedCases > 0) {
    console.error(`\n[FAILED] ${result.failedCases} test case(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\n[PASSED] 100% of test cases passed cleanly.`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal runner error:", err);
  process.exit(1);
});
