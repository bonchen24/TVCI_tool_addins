import test from 'node:test';
import assert from 'node:assert/strict';
import { RULE_PROFILES, getRuleProfile, resolveRuleProfileForOrganization } from '../src/rules/profiles.ts';
import { validatePageSetup } from '../src/rules/page-validator.ts';
import { getComponentRule } from '../src/rules/component-rules.ts';

test('exposes four rule profiles including current Party guidance', () => {
  assert.deepEqual(RULE_PROFILES.map((p) => p.id), ['NĐ30_TVCI', 'TKV', 'IEMM', 'DANG_05_HD_VPTW_2026']);
  const party = getRuleProfile('DANG_05_HD_VPTW_2026');
  assert.equal(party.body.fontName, 'Times New Roman');
  assert.equal(party.body.fontSize, 13);
  assert.deepEqual(party.page, { paperSize: 'A4', orientation: 'Portrait', topMm: 20, bottomMm: 20, leftMm: 30, rightMm: 15 });
  const nd30 = getRuleProfile('NĐ30_TVCI');
  assert.deepEqual(nd30.page?.leftMm, { min: 30, max: 35, target: 30 });
});

test('maps template organizations to rule profiles', () => {
  assert.equal(resolveRuleProfileForOrganization('TVCI').id, 'NĐ30_TVCI');
  assert.equal(resolveRuleProfileForOrganization('TKV').id, 'TKV');
  assert.equal(resolveRuleProfileForOrganization('IEMM').id, 'IEMM');
  assert.equal(resolveRuleProfileForOrganization('DANG').id, 'DANG_05_HD_VPTW_2026');
});

test('validates page setup with a tolerance in millimeters', () => {
  const rule = getRuleProfile('DANG_05_HD_VPTW_2026').page!;
  const ok = validatePageSetup({ paperSize: 'A4', orientation: 'Portrait', topMm: 20.1, bottomMm: 19.9, leftMm: 30, rightMm: 15.2 }, rule, 0.5);
  assert.equal(ok.length, 0);
  const bad = validatePageSetup({ paperSize: 'A4', orientation: 'Portrait', topMm: 25, bottomMm: 20, leftMm: 25, rightMm: 20 }, rule, 0.5);
  assert.deepEqual(bad.map((x) => x.ruleId), ['page.topMm', 'page.leftMm', 'page.rightMm']);
});

 test('NĐ30 accepts margins inside the permitted range', () => {
  const rule = getRuleProfile('NĐ30_TVCI').page!;
  const issues = validatePageSetup({ paperSize: 'A4', orientation: 'Portrait', topMm: 24, bottomMm: 25, leftMm: 35, rightMm: 15 }, rule, 0.1);
  assert.equal(issues.length, 0);
});

test("IEMM profile follows the attached Viện typography baseline", () => {
  const iemm = getRuleProfile("IEMM");
  assert.equal(iemm.body.fontName, "Times New Roman");
  assert.equal(iemm.body.fontSize, 13);
  assert.match(iemm.sourceLabel, /Phụ lục IV/i);
  const docType = getComponentRule("IEMM", "DOCUMENT_TYPE");
  assert.equal(docType.fontSize, 13);
  const recipients = getComponentRule("IEMM", "RECIPIENTS");
  assert.equal(recipients.fontSize, 12);
  assert.equal(recipients.italic, true);
});
