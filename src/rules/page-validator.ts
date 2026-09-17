import type { MeasurementRule, PageRules, PageSetupSnapshot, ValidationIssue } from './models';

export function validatePageSetup(snapshot: PageSetupSnapshot, rules: PageRules, toleranceMm = 0.5): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (field: keyof PageRules, actual: string | number, expected: string | number) => issues.push({
    id: `page-${String(field)}`,
    ruleId: `page.${String(field)}`,
    targetId: 'page',
    message: `Sai ${field === 'paperSize' ? 'khổ giấy' : field === 'orientation' ? 'hướng giấy' : 'lề trang'}`,
    severity: 'error', autoFixable: true, actual, expected,
  });
  if (rules.paperSize && snapshot.paperSize !== rules.paperSize) push('paperSize', snapshot.paperSize, rules.paperSize);
  if (rules.orientation && snapshot.orientation !== rules.orientation) push('orientation', snapshot.orientation, rules.orientation);
  const resolveMeasurement = (rule: MeasurementRule) => typeof rule === 'number' ? { valid: (actual: number) => Math.abs(actual - rule) <= toleranceMm, target: rule } : { valid: (actual: number) => actual >= rule.min - toleranceMm && actual <= rule.max + toleranceMm, target: rule.target };
  for (const field of ['topMm','bottomMm','leftMm','rightMm'] as const) {
    const expected = rules[field];
    if (expected === undefined) continue;
    const measurement = resolveMeasurement(expected);
    if (!measurement.valid(snapshot[field])) push(field, snapshot[field], measurement.target);
  }
  return issues;
}
