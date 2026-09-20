import {
  loadSavedSettingsOrNull,
  type DocumentSettings,
} from "../models/document-settings";
import { profileStorage, type UserDraftingProfile } from "../profiles/profile-storage";
import { detectProfileForDocument, evaluateDocumentInspection, type DocumentInspection } from "../rules/document-inspection";
import type { RuleProfileId } from "../rules/profiles";
import { inspectDocumentParagraphs } from "../word/formatting.service";
import { inspectPageSetup } from "../word/page-formatting.service";

export interface CommandContext {
  settings: DocumentSettings | null;
  activeProfile: UserDraftingProfile | null;
  inspection: DocumentInspection;
}

const presetToProfile: Record<DocumentSettings["presetId"], RuleProfileId> = {
  ND30: "NĐ30_TVCI",
  TVCI: "NĐ30_TVCI",
  IEMM: "IEMM",
  TKV: "TKV",
  PARTY: "DANG_05_HD_VPTW_2026",
  PERSONAL: "NĐ30_TVCI",
};

function profileForDraftingProfile(profile: UserDraftingProfile | null): RuleProfileId | null {
  if (!profile) return null;
  if (profile.organization === "DANG") return "DANG_05_HD_VPTW_2026";
  if (profile.organization === "IEMM") return "IEMM";
  return "NĐ30_TVCI";
}

export async function resolveCommandContext(): Promise<CommandContext> {
  const settings = loadSavedSettingsOrNull();
  const activeProfile = profileStorage.getActiveProfile();
  const paragraphSnapshots = await inspectDocumentParagraphs();
  const detected = detectProfileForDocument(paragraphSnapshots);
  const configuredProfile = settings ? presetToProfile[settings.presetId] : profileForDraftingProfile(activeProfile);
  // Strong document evidence wins; otherwise use the user's saved configuration.
  const profileId = detected.confidence >= 0.75
    ? detected.ruleProfileId
    : configuredProfile || "NĐ30_TVCI";

  let pageSnapshot = null;
  try {
    pageSnapshot = await inspectPageSetup();
  } catch {
    pageSnapshot = null;
  }

  return {
    settings,
    activeProfile,
    inspection: evaluateDocumentInspection(profileId, paragraphSnapshots, pageSnapshot),
  };
}

export function profileIdForSettings(settings: DocumentSettings | null): RuleProfileId {
  return settings ? presetToProfile[settings.presetId] : "NĐ30_TVCI";
}
