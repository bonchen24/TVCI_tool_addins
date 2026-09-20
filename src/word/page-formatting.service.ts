import type { MeasurementRule, PageRules, PageSetupSnapshot, ValidationIssue } from '../rules/models';

const POINTS_PER_MM = 72 / 25.4;
const mmToPoints = (mm: number) => mm * POINTS_PER_MM;
const pointsToMm = (points: number) => Math.round((points / POINTS_PER_MM) * 10) / 10;

export function supportsDesktopPageSetup(): boolean {
  return Boolean(Office.context.requirements?.isSetSupported?.('WordApiDesktop', '1.3'));
}

export async function inspectPageSetup(): Promise<PageSetupSnapshot | null> {
  if (!supportsDesktopPageSetup()) return null;
  return Word.run(async (context) => {
    const setup = context.document.sections.getFirst().pageSetup;
    setup.load('paperSize,orientation,topMargin,bottomMargin,leftMargin,rightMargin');
    await context.sync();
    return {
      paperSize: String(setup.paperSize) === 'A4' ? 'A4' : 'Other',
      orientation: String(setup.orientation) === 'Landscape' ? 'Landscape' : 'Portrait',
      topMm: pointsToMm(setup.topMargin),
      bottomMm: pointsToMm(setup.bottomMargin),
      leftMm: pointsToMm(setup.leftMargin),
      rightMm: pointsToMm(setup.rightMargin),
    };
  });
}

export async function applyPageIssueFix(issue: ValidationIssue): Promise<void> {
  if (!supportsDesktopPageSetup()) throw new Error('Word hiện tại chưa hỗ trợ PageSetup API. Hãy dùng Word desktop mới hơn để sửa lề/khổ giấy tự động.');
  await Word.run(async (context) => {
    const setup = context.document.sections.getFirst().pageSetup;
    switch (issue.ruleId) {
      case 'page.paperSize': setup.paperSize = 'A4' as Word.PaperSize; break;
      case 'page.orientation': setup.orientation = String(issue.expected) as Word.PageOrientation; break;
      case 'page.topMm': setup.topMargin = mmToPoints(Number(issue.expected)); break;
      case 'page.bottomMm': setup.bottomMargin = mmToPoints(Number(issue.expected)); break;
      case 'page.leftMm': setup.leftMargin = mmToPoints(Number(issue.expected)); break;
      case 'page.rightMm': setup.rightMargin = mmToPoints(Number(issue.expected)); break;
      default: throw new Error(`Quy tắc trang chưa hỗ trợ sửa tự động: ${issue.ruleId}`);
    }
    await context.sync();
  });
}

const targetMeasurement = (rule: MeasurementRule) => typeof rule === 'number' ? rule : rule.target;

export async function applyPageRules(rules: PageRules): Promise<void> {
  if (!supportsDesktopPageSetup()) throw new Error('Word hiện tại chưa hỗ trợ PageSetup API.');
  await Word.run(async (context) => {
    const sections = context.document.sections;
    sections.load('items');
    await context.sync();
    for (const section of sections.items) {
      const setup = section.pageSetup;
      if (rules.paperSize === 'A4') setup.paperSize = 'A4' as Word.PaperSize;
      if (rules.orientation) setup.orientation = rules.orientation as Word.PageOrientation;
      if (rules.topMm !== undefined) setup.topMargin = mmToPoints(targetMeasurement(rules.topMm));
      if (rules.bottomMm !== undefined) setup.bottomMargin = mmToPoints(targetMeasurement(rules.bottomMm));
      if (rules.leftMm !== undefined) setup.leftMargin = mmToPoints(targetMeasurement(rules.leftMm));
      if (rules.rightMm !== undefined) setup.rightMargin = mmToPoints(targetMeasurement(rules.rightMm));
    }
    await context.sync();
  });
}

export async function toggleDocumentOrientation(): Promise<void> {
  if (!supportsDesktopPageSetup()) throw new Error('Word hiện tại chưa hỗ trợ PageSetup API.');
  await Word.run(async (context) => {
    const sections = context.document.sections;
    sections.load('items');
    await context.sync();
    if (sections.items.length === 0) return;

    const firstSetup = sections.items[0].pageSetup;
    firstSetup.load('orientation');
    await context.sync();
    const next = String(firstSetup.orientation) === 'Landscape' ? 'Portrait' : 'Landscape';
    for (const section of sections.items) section.pageSetup.orientation = next as Word.PageOrientation;
    await context.sync();
  });
}
