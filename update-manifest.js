const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_MANIFEST_PATH = path.join(__dirname, 'manifest', 'manifest.xml');

const CANONICAL_GROUP_IDS = [
  'GroupAi',
  'GroupDocument',
  'GroupQuickInsert',
  'GroupLayout',
];

const CANONICAL_CONTROL_IDS = [
  'SmartDraftingButton',
  'LearnExperienceButton',
  'KnowledgeButton',
  'SettingsButton',
  'CreateDocMenu',
  'TemplateLibraryButton',
  'TemplateWizardButton',
  'DocumentToolsMenu',
  'QuickStandardizeButton',
  'RollbackButton',
  'QuickInsertMenu',
  'PageLayoutMenu',
];

const REQUIRED_LABELS = [
  'Tạo biểu mẫu',
  'Tạo kinh nghiệm',
  'Kho tri thức',
  'Kiểm tra &amp; cấu hình',
  'Chuẩn hóa nhanh',
  'Hoàn tác chuẩn hóa',
];

const RETIRED_MARKERS = [
  'Group' + 'Standardize',
  'Group' + 'PageLayout',
  'Group' + 'Resources',
  ['Chuẩn hóa', '1-click'].join(' '),
  ['Nhận', 'kinh nghiệm'].join(' '),
];
const SHOW_TASKPANE_TYPE = ['Show', 'Taskpane'].join('');

function getResourceIds(xml) {
  return [...xml.matchAll(/<bt:(?:Image|Url|String)\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
}

function validateCanonicalRibbon(xml) {
  const errors = [];
  const customTab = xml.match(/<CustomTab id="TabTVCI">[\s\S]*?<\/CustomTab>/)?.[0];

  if (!customTab) {
    errors.push('missing the canonical TabTVCI Ribbon');
  } else {
    const groupIds = [...customTab.matchAll(/<Group id="([^"]+)"/g)].map((match) => match[1]);
    if (JSON.stringify(groupIds) !== JSON.stringify(CANONICAL_GROUP_IDS)) {
      errors.push(`Ribbon groups must be ${CANONICAL_GROUP_IDS.join(', ')}`);
    }

    const controlIds = [...customTab.matchAll(/<Control\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
    if (JSON.stringify(controlIds) !== JSON.stringify(CANONICAL_CONTROL_IDS)) {
      errors.push('Ribbon direct/menu controls do not match the canonical layout');
    }
  }

  for (const label of REQUIRED_LABELS) {
    if (!xml.includes(`DefaultValue="${label}"`)) {
      errors.push(`missing canonical label ${label}`);
    }
  }

  if (new RegExp(`<Action\\b[^>]*xsi:type="${SHOW_TASKPANE_TYPE}"`).test(xml)) {
    errors.push('Ribbon actions must not expose a task pane');
  }

  const resourceIds = getResourceIds(xml);
  const duplicateResourceIds = resourceIds.filter((id, index) => resourceIds.indexOf(id) !== index);
  if (duplicateResourceIds.length > 0) {
    errors.push(`duplicate Ribbon resource ids: ${[...new Set(duplicateResourceIds)].join(', ')}`);
  }

  if (RETIRED_MARKERS.some((marker) => xml.includes(marker)) || xml.includes(SHOW_TASKPANE_TYPE)) {
    errors.push('manifest contains retired Ribbon architecture or labels');
  }

  return errors;
}

function updateManifest(manifestPath = DEFAULT_MANIFEST_PATH) {
  const resolvedManifestPath = path.resolve(manifestPath);
  const xml = fs.readFileSync(resolvedManifestPath, 'utf8');
  const errors = validateCanonicalRibbon(xml);

  if (errors.length > 0) {
    throw new Error(
      `[manifest-updater] Refusing to write ${resolvedManifestPath}: ${errors.join('; ')}`,
    );
  }

  console.log(
    `[manifest-updater] ${resolvedManifestPath} already matches the canonical Ribbon; no changes written. ` +
      'This maintenance utility is intentionally read-only.',
  );
  return { changed: false, manifestPath: resolvedManifestPath };
}

function main() {
  const manifestPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : DEFAULT_MANIFEST_PATH;

  try {
    updateManifest(manifestPath);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

module.exports = {
  getResourceIds,
  updateManifest,
  validateCanonicalRibbon,
};

if (require.main === module) {
  main();
}
