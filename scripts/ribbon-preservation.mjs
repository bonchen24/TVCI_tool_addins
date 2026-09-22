import fs from "node:fs";
import path from "node:path";

export const CANONICAL_RIBBON_GROUPS = [
  "GroupAi",
  "GroupDocument",
  "GroupQuickInsert",
  "GroupLayout",
];

export const CANONICAL_RIBBON_IDENTIFIERS = [
  ...CANONICAL_RIBBON_GROUPS,
  "TemplateLibraryButton",
  "TemplateWizardButton",
  "DocumentToolsMenu",
  "QuickStandardizeButton",
  "RollbackButton",
  "LearnExperienceButton",
  "KnowledgeButton",
  "ItemCheckDocument",
  "ItemDocumentSettings",
];

export const LEGACY_RIBBON_MARKERS = [
  "ShowTaskpane",
  "GroupStandardize",
  "GroupPageLayout",
  "GroupResources",
];

function customTab(source) {
  return source.match(/<CustomTab\b[^>]*id="TabTVCI"[\s\S]*?<\/CustomTab>/)?.[0] ?? "";
}

function resources(source) {
  return source.match(/<Resources>[\s\S]*?<\/Resources>/)?.[0] ?? "";
}

function normalizeRibbonUrls(source) {
  return source.replace(/https:\/\/[^"'<>\s]+/g, (value) => {
    const pathname = new URL(value).pathname;
    const asset = pathname.match(/\/assets\/(.+)$/);
    if (asset) return `__ASSET__/${asset[1]}`;
    const page = pathname.match(/\/(taskpane|commands|dialog)\.html$/);
    if (page) return `__PAGE__/${page[1]}.html`;
    return "__URL__";
  });
}

export function ribbonPreservationFingerprint(source) {
  return normalizeRibbonUrls(`${customTab(source)}\n${resources(source)}`);
}

export function inspectCanonicalRibbonManifest(source) {
  const tab = customTab(source);
  const groups = [...tab.matchAll(/<Group\b[^>]*id="([^"]+)"/g)].map((match) => match[1]);
  const identifiers = [...tab.matchAll(/<(?:Group|Control|Item)\b[^>]*id="([^"]+)"/g)].map((match) => match[1]);
  const missing = CANONICAL_RIBBON_IDENTIFIERS.filter((id) => !identifiers.includes(id));
  const stale = LEGACY_RIBBON_MARKERS.filter((marker) => source.includes(marker));

  return {
    ok: Boolean(tab) && missing.length === 0 && stale.length === 0 &&
      JSON.stringify(groups) === JSON.stringify(CANONICAL_RIBBON_GROUPS),
    groups,
    missing,
    stale,
  };
}

export function manifestAssetPaths(source) {
  const paths = [...source.matchAll(/https:\/\/[^"'<>\s]+\/(assets\/[^"'<>\s]+)/g)]
    .map((match) => decodeURIComponent(match[1]));
  return [...new Set(paths)];
}

export function missingManifestAssets(source, packageRoot) {
  return manifestAssetPaths(source).filter((relativePath) =>
    !fs.existsSync(path.join(packageRoot, ...relativePath.split("/"))),
  );
}
