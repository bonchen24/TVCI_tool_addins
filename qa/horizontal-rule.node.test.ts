import test from "node:test";
import assert from "node:assert/strict";
import {
  HORIZONTAL_RULE_SPECS,
  calculateHorizontalRuleWidth,
  buildHorizontalRuleOoxml,
  validateHorizontalRuleSnapshot,
  type HorizontalRuleSnapshot,
} from "../src/rules/horizontal-rules.ts";

const available = 450;

test("horizontal rule specs expose only the variable title rule", () => {
  assert.deepEqual(HORIZONTAL_RULE_SPECS.TITLE_ABSTRACT.ratio, { min: 1 / 3, max: 1 / 2, target: 0.4 });
  assert.deepEqual(Object.keys(HORIZONTAL_RULE_SPECS), ["TITLE_ABSTRACT"]);
});

test("calculates centered variable width for the title rule", () => {
  assert.equal(calculateHorizontalRuleWidth("TITLE_ABSTRACT", available, 160), 64);
});

test("OOXML uses a floating title line in front of text", () => {
  const ooxml = buildHorizontalRuleOoxml("TITLE_ABSTRACT", 180, available);
  assert.match(ooxml, /TVCI_HRULE:TITLE_ABSTRACT/);
  assert.match(ooxml, /wp:anchor[^>]*behindDoc="0"/);
  assert.match(ooxml, /wp:wrapNone\/>/);
  assert.match(ooxml, /wps:wsp/);
  assert.doesNotMatch(ooxml, /w:pBdr/);
});

test("validates title rule widths against its variable ratio", () => {
  const ok: HorizontalRuleSnapshot = { kind: "TITLE_ABSTRACT", exists: true, widthPoints: 180, availableWidthPoints: 450 };
  assert.equal(validateHorizontalRuleSnapshot(ok).length, 0);

  const tooLong: HorizontalRuleSnapshot = { kind: "TITLE_ABSTRACT", exists: true, widthPoints: 360, availableWidthPoints: 450 };
  assert.equal(validateHorizontalRuleSnapshot(tooLong)[0]?.ruleId, "horizontal.TITLE_ABSTRACT.width");
});
