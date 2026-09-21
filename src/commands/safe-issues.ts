import type { CommandContext } from "./command-context";
import type { ValidationIssue } from "../rules/models";
import { applyIssueFix, applyTextIssueFix } from "../word/formatting.service";
import { applyPageIssueFix } from "../word/page-formatting.service";

export function safeIssues(context: CommandContext): ValidationIssue[] {
  const failedResults = context.inspection.summary.results.filter((result) => result.status === "FAIL");
  const failedRuleIds = new Set(failedResults.map((result) => result.ruleId));
  const failedTargetIds = new Set(failedResults.map((result) => result.targetId).filter(Boolean));
  // MISSING rules never have a repair payload and are explicitly excluded here.
  return context.inspection.summary.issues.filter(
    (issue) => issue.autoFixable && (failedRuleIds.has(issue.ruleId) || failedTargetIds.has(issue.targetId)),
  );
}

export async function applySafeIssues(context: CommandContext): Promise<number> {
  let fixed = 0;
  for (const issue of safeIssues(context)) {
    try {
      if (issue.targetId === "page") await applyPageIssueFix(issue);
      else if (issue.ruleId.startsWith("text.")) await applyTextIssueFix(issue);
      else await applyIssueFix(issue);
      fixed += 1;
    } catch (error) {
      console.warn("Could not apply safe issue", issue.ruleId, error);
    }
  }
  return fixed;
}
