import type { MeasurementRule, PageRules, PageSetupSnapshot, ValidationIssue } from './models';

export function validatePageSetup(
  snapshot: PageSetupSnapshot,
  rules: PageRules,
  toleranceMm = 0.5
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (
    field: keyof PageRules,
    actual: string | number,
    expected: string | number,
    fixValue?: string | number
  ) =>
    issues.push({
      id: `page-${String(field)}`,
      ruleId: `page.${String(field)}`,
      targetId: 'page',
      category: 'page',
      componentType: 'PAGE',
      message: `Sai ${
        field === 'paperSize'
          ? 'khổ giấy'
          : field === 'orientation'
          ? 'hướng giấy'
          : 'lề trang'
      }`,
      severity: 'error',
      status: 'FAIL',
      autoFixable: true,
      actual,
      expected,
      fixValue: fixValue ?? expected,
    });

  if (rules.paperSize && snapshot.paperSize) {
    const snapSize = snapshot.paperSize.toUpperCase();
    const ruleSize = String(rules.paperSize).toUpperCase();
    if (snapSize !== ruleSize) {
      push('paperSize', snapshot.paperSize, rules.paperSize);
    }
  }

  if (rules.orientation && snapshot.orientation) {
    const snapOrient = snapshot.orientation.toLowerCase();
    const ruleOrient = String(rules.orientation).toLowerCase();
    if (snapOrient !== ruleOrient) {
      push('orientation', snapshot.orientation, rules.orientation);
    }
  }

  const resolveMeasurement = (rule: MeasurementRule) =>
    typeof rule === 'number'
      ? {
          valid: (actual: number) => Math.abs(actual - rule) <= toleranceMm,
          target: rule,
          min: rule,
          max: rule,
        }
      : {
          valid: (actual: number) =>
            actual >= rule.min - toleranceMm && actual <= rule.max + toleranceMm,
          target: rule.target,
          min: rule.min,
          max: rule.max,
        };

  const fields = [
    { key: 'topMm' as const, snapVal: snapshot.topMm ?? snapshot.topMarginMm },
    { key: 'bottomMm' as const, snapVal: snapshot.bottomMm ?? snapshot.bottomMarginMm },
    { key: 'leftMm' as const, snapVal: snapshot.leftMm ?? snapshot.leftMarginMm },
    { key: 'rightMm' as const, snapVal: snapshot.rightMm ?? snapshot.rightMarginMm },
  ];

  for (const { key, snapVal } of fields) {
    const expected = rules[key];
    if (expected === undefined || snapVal === undefined) continue;
    const measurement = resolveMeasurement(expected);
    if (!measurement.valid(snapVal)) {
      const expStr =
        typeof expected === 'number' ? expected : `${measurement.min}-${measurement.max}mm`;
      push(key, snapVal, expStr, measurement.target);
    }
  }

  return issues;
}
