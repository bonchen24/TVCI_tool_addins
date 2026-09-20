import { classifyDocumentComponents, type ClassifiedComponent } from "./component-classifier";
import { detectDocumentContext } from "./auto-detect.service";
import { evaluateDocumentRules } from "./document-evaluator";
import { getRuleProfile, type RuleProfileId } from "./profiles";
import type { DocumentEvaluationSummary, PageSetupSnapshot, ParagraphSnapshot } from "./models";
import { inspectDocumentParagraphs } from "../word/formatting.service";
import { inspectPageSetup } from "../word/page-formatting.service";

export interface DocumentInspection {
  profileId: RuleProfileId;
  paragraphSnapshots: ParagraphSnapshot[];
  pageSnapshot: PageSetupSnapshot | null;
  summary: DocumentEvaluationSummary;
  components: Array<ClassifiedComponent & { text: string }>;
}

export function evaluateDocumentInspection(
  profileId: RuleProfileId,
  paragraphSnapshots: ParagraphSnapshot[],
  pageSnapshot: PageSetupSnapshot | null,
): DocumentInspection {
  const summary = evaluateDocumentRules({
    profileId,
    validationScope: "document",
    paragraphSnapshots,
    pageSnapshot,
    horizontalRuleSnapshot: null,
  });
  const family = profileId === "DANG_05_HD_VPTW_2026" ? "PARTY" : "ADMINISTRATIVE";
  const components = summary.isBlankDocument
    ? []
    : classifyDocumentComponents(paragraphSnapshots.map((snapshot) => snapshot.text), family)
        .map((component) => ({ ...component, text: paragraphSnapshots[component.paragraphIndex]?.text ?? "" }));

  return { profileId, paragraphSnapshots, pageSnapshot, summary, components };
}

export async function inspectCurrentDocument(profileId: RuleProfileId): Promise<DocumentInspection> {
  const paragraphSnapshots = await inspectDocumentParagraphs();
  const detected = detectProfileForDocument(paragraphSnapshots);
  const resolvedProfileId = detected.confidence >= 0.75 ? detected.ruleProfileId : profileId;
  let pageSnapshot: PageSetupSnapshot | null = null;
  if (getRuleProfile(resolvedProfileId).page) {
    try {
      pageSnapshot = await inspectPageSetup();
    } catch {
      // An unsupported or failed page read is deliberately represented as unavailable.
      pageSnapshot = null;
    }
  }
  return evaluateDocumentInspection(resolvedProfileId, paragraphSnapshots, pageSnapshot);
}

export function detectProfileForDocument(paragraphSnapshots: ParagraphSnapshot[]): ReturnType<typeof detectDocumentContext> {
  return detectDocumentContext(paragraphSnapshots.map((snapshot) => snapshot.text));
}
