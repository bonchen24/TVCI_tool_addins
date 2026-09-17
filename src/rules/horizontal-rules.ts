import type { ValidationIssue } from './models';

export type HorizontalRuleKind = 'TITLE_ABSTRACT';

type RatioRule = { min: number; max: number; target: number };
export type HorizontalRuleSpec =
  | { mode: 'ratio'; ratio: RatioRule };

export const HORIZONTAL_RULE_SPECS: Record<HorizontalRuleKind, HorizontalRuleSpec> = {
  TITLE_ABSTRACT: { mode: 'ratio', ratio: { min: 1 / 3, max: 1 / 2, target: 0.4 } },
};

export interface HorizontalRuleSnapshot {
  kind: HorizontalRuleKind;
  exists: boolean;
  widthPoints: number;
  availableWidthPoints: number;
  expectedTextWidthPoints?: number;
}

export function estimateLongestLineWidth(text: string, fontSize = 13): number {
  const longestLine = text.split(/\r?\n/).map((line) => line.trim()).reduce((longest, line) => Math.max(longest, line.length), 0);
  return Math.max(1, longestLine * fontSize * 0.52);
}

export function calculateHorizontalRuleWidth(kind: HorizontalRuleKind, availableWidthPoints: number, textWidthPoints: number): number {
  const spec = HORIZONTAL_RULE_SPECS[kind];
  const target = textWidthPoints > 0 ? textWidthPoints * spec.ratio.target : availableWidthPoints * spec.ratio.target;
  return Math.round(Math.min(availableWidthPoints, target) * 1000) / 1000;
}

function pointsToEmu(points: number): number {
  return Math.round(points * 12700);
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildHorizontalRuleOoxml(kind: HorizontalRuleKind, widthPoints: number, availableWidthPoints: number): string {
  const sideIndent = Math.max(0, (availableWidthPoints - widthPoints) / 2);
  const xEmu = pointsToEmu(sideIndent);
  const widthEmu = pointsToEmu(widthPoints);
  const heightEmu = pointsToEmu(0.5);
  const lineWidth = pointsToEmu(0.5);
  const tag = escapeXml(`TVCI_HRULE:${kind}`);
  return `<w:sdt xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:sdtPr><w:tag w:val="${tag}"/></w:sdtPr><w:sdtContent><w:p><w:pPr><w:spacing w:after="0" w:before="0"/></w:pPr><w:r><w:drawing><wp:anchor xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:align>center</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>-12700</wp:posOffset></wp:positionV><wp:extent cx="${widthEmu}" cy="${heightEmu}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="171" name="TVCI title rule"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="0"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="${lineWidth}"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:prstDash val="solid"/></a:ln></wps:spPr><wps:style/><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p></w:sdtContent></w:sdt>`;
}

function widthIssue(snapshot: HorizontalRuleSnapshot, expected: string, target: number): ValidationIssue {
  return {
    id: `horizontal-${snapshot.kind}-width`,
    ruleId: `horizontal.${snapshot.kind}.width`,
    targetId: `horizontal:${snapshot.kind}`,
    message: `Đường kẻ ${snapshot.kind} chưa đúng độ dài`,
    severity: 'error',
    autoFixable: true,
    actual: snapshot.widthPoints,
    expected,
    fixValue: target,
  };
}

export function validateHorizontalRuleSnapshot(snapshot: HorizontalRuleSnapshot): ValidationIssue[] {
  const spec = HORIZONTAL_RULE_SPECS[snapshot.kind];
  if (!snapshot.exists) {
    return [{
      id: `horizontal-${snapshot.kind}-missing`,
      ruleId: `horizontal.${snapshot.kind}.missing`,
      targetId: `horizontal:${snapshot.kind}`,
      message: `Thiếu đường kẻ ${snapshot.kind}`,
      severity: 'error',
      autoFixable: true,
      actual: false,
      expected: true,
    }];
  }
  const baseWidth = snapshot.expectedTextWidthPoints ?? snapshot.availableWidthPoints;
  const ratio = snapshot.widthPoints / baseWidth;
  if (ratio < spec.ratio.min || ratio > spec.ratio.max) {
    return [widthIssue(snapshot, `${Math.round(spec.ratio.min * 100)}-${Math.round(spec.ratio.max * 100)}% chiều dài dòng dài nhất`, calculateHorizontalRuleWidth(snapshot.kind, snapshot.availableWidthPoints, baseWidth))];
  }
  return [];
}
