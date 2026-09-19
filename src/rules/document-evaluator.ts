import type {
  DocumentEvaluationSummary,
  PageSetupSnapshot,
  ParagraphSnapshot,
  RuleEvaluationResult,
  RuleEvaluationStatus,
  ValidationIssue,
} from "./models";
import { getRuleProfile, type RuleProfileId } from "./profiles";
import { classifyDocumentComponents, type DocumentComponentType } from "./component-classifier";
import { getComponentRule, getRecipientsItemRule } from "./component-rules";
import { validateComponentParagraph } from "./component-validator";
import { validateAddresseeBlock } from "./addressee-validator";
import { validateRecipientsBlock } from "./recipients-validator";
import { validateLegalBasisBlock } from "./legal-basis-validator";
import { validatePageSetup } from "./page-validator";
import { validateHorizontalRuleSnapshot, type HorizontalRuleSnapshot } from "./horizontal-rules";
import { detectDocumentContext } from "./auto-detect.service";

export interface DocumentEvaluationInput {
  profileId: RuleProfileId;
  validationScope: "document" | "selection";
  paragraphSnapshots: ParagraphSnapshot[];
  pageSnapshot?: PageSetupSnapshot | null;
  horizontalRuleSnapshot?: HorizontalRuleSnapshot | null;
}

const TOTAL_CATALOG_RULES = 27;

export function evaluateDocumentRules(input: DocumentEvaluationInput): DocumentEvaluationSummary {
  const { profileId, validationScope, paragraphSnapshots, pageSnapshot, horizontalRuleSnapshot } = input;
  const profile = getRuleProfile(profileId);
  const family = profileId === "DANG_05_HD_VPTW_2026" ? "PARTY" : "ADMINISTRATIVE";

  // Detect blank document: empty array or all whitespace
  const isBlankDocument =
    !paragraphSnapshots ||
    paragraphSnapshots.length === 0 ||
    paragraphSnapshots.every((p) => !p.text || p.text.trim().length === 0);

  if (isBlankDocument) {
    return {
      isBlankDocument: true,
      totalRules: TOTAL_CATALOG_RULES,
      applicableRules: 0,
      passedRules: 0,
      failedRules: 0,
      missingRules: 0,
      notApplicableRules: TOTAL_CATALOG_RULES,
      healthScore: 0,
      results: [],
      issues: [],
    };
  }

  const rawTexts = paragraphSnapshots.map((p) => p.text);
  const detected = detectDocumentContext(rawTexts);
  const isCongVanOrToTrinh = /^(Công văn|Tờ trình|Giấy giới thiệu)/i.test(detected.documentType);
  const isQuyetDinh = /^Quyết định/i.test(detected.documentType);

  // Classify components
  const components = classifyDocumentComponents(rawTexts, family);
  const componentByType = new Map<DocumentComponentType, { index: number; snapshot: ParagraphSnapshot }>();
  for (const c of components) {
    if (!componentByType.has(c.type) && paragraphSnapshots[c.paragraphIndex]) {
      componentByType.set(c.type, {
        index: c.paragraphIndex,
        snapshot: paragraphSnapshots[c.paragraphIndex],
      });
    }
  }

  const componentIndices = new Set(components.map((c) => c.paragraphIndex));

  // Expand componentIndices for multi-line blocks so they aren't evaluated as general body
  const signerRoleComp = componentByType.get("SIGNER_ROLE");
  if (signerRoleComp) {
    for (let i = signerRoleComp.index; i < Math.min(paragraphSnapshots.length, signerRoleComp.index + 5); i++) {
      componentIndices.add(i);
    }
  }

  const recipientsComp = componentByType.get("RECIPIENTS");
  if (recipientsComp) {
    for (let i = recipientsComp.index + 1; i < Math.min(paragraphSnapshots.length, recipientsComp.index + 10); i++) {
      const pText = paragraphSnapshots[i]?.text.trim() ?? "";
      if (!pText || /^(Kính gửi|Nội dung|Điều\s+\d+|TM\.|KT\.|TL\.|TUQ\.|GIÁM ĐỐC|CHỦ TỊCH|BÍ THƯ)/i.test(pText)) break;
      componentIndices.add(i);
      if (/^Lưu\s*:/i.test(pText)) break;
    }
  }

  const legalBasisComp = componentByType.get("LEGAL_BASIS");
  if (legalBasisComp) {
    for (let i = legalBasisComp.index + 1; i < Math.min(paragraphSnapshots.length, legalBasisComp.index + 15); i++) {
      const pText = paragraphSnapshots[i]?.text.trim() ?? "";
      if (!/^Căn cứ\b/i.test(pText)) break;
      componentIndices.add(i);
    }
  }

  const bodyParagraphs = paragraphSnapshots.filter((p, index) => !componentIndices.has(index) && p.text && p.text.trim().length > 0);

  const results: RuleEvaluationResult[] = [];
  const allIssues: ValidationIssue[] = [];

  const addResult = (
    ruleId: string,
    category: RuleEvaluationResult["category"],
    title: string,
    status: RuleEvaluationStatus,
    options?: {
      message?: string;
      targetId?: string;
      issues?: ValidationIssue[];
    },
  ) => {
    results.push({
      ruleId,
      category,
      title,
      status,
      message: options?.message,
      targetId: options?.targetId,
    });
    if (options?.issues) {
      allIssues.push(...options.issues);
    }
  };

  // --- 1. PAGE SETUP RULES (6 rules) ---
  if (validationScope === "document" && profile.page && pageSnapshot) {
    const pageIssues = validatePageSetup(pageSnapshot, profile.page);

    const checkPageField = (field: "paperSize" | "orientation" | "topMm" | "bottomMm" | "leftMm" | "rightMm", title: string) => {
      const issue = pageIssues.find((i) => i.ruleId === `page.${field}`);
      if (issue) {
        addResult(`page.${field}`, "page", title, "FAIL", {
          message: issue.message,
          targetId: "page",
          issues: [issue],
        });
      } else {
        addResult(`page.${field}`, "page", title, "PASS");
      }
    };

    checkPageField("paperSize", "Khổ giấy chuẩn A4");
    checkPageField("orientation", "Hướng giấy dọc (Portrait)");
    checkPageField("topMm", "Lề trên trang giấy (20-25mm)");
    checkPageField("bottomMm", "Lề dưới trang giấy (20-25mm)");
    checkPageField("leftMm", "Lề trái trang giấy (30-35mm)");
    checkPageField("rightMm", "Lề phải trang giấy (15-20mm)");
  } else {
    // If pageSnapshot not available or selection scope, page rules are NOT_APPLICABLE
    const pageRules = [
      { id: "page.paperSize", title: "Khổ giấy chuẩn A4" },
      { id: "page.orientation", title: "Hướng giấy dọc (Portrait)" },
      { id: "page.topMm", title: "Lề trên trang giấy (20-25mm)" },
      { id: "page.bottomMm", title: "Lề dưới trang giấy (20-25mm)" },
      { id: "page.leftMm", title: "Lề trái trang giấy (30-35mm)" },
      { id: "page.rightMm", title: "Lề phải trang giấy (15-20mm)" },
    ];
    for (const r of pageRules) {
      addResult(r.id, "page", r.title, "NOT_APPLICABLE", {
        message: "Không kiểm tra lề trang trong phạm vi đoạn chọn hoặc Word không hỗ trợ",
      });
    }
  }

  // --- 2. HEADER RULES (4 rules) ---
  // 2.1 National Emblem
  if (family === "PARTY") {
    addResult("header.national_emblem", "header", "Quốc hiệu", "NOT_APPLICABLE");
  } else {
    const emblem = componentByType.get("NATIONAL_EMBLEM");
    if (!emblem) {
      const issue: ValidationIssue = {
        id: "missing-national-emblem",
        ruleId: "component.NATIONAL_EMBLEM.missing",
        targetId: "missing:national_emblem",
        message: "[Quốc hiệu] Thiếu Quốc hiệu 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'",
        severity: "error",
        autoFixable: false,
        actual: "Không có",
        expected: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      };
      addResult("header.national_emblem", "header", "Quốc hiệu", "MISSING", {
        message: issue.message,
        targetId: issue.targetId,
        issues: [issue],
      });
    } else {
      const rule = getComponentRule(profileId, "NATIONAL_EMBLEM");
      const emblemIssues = validateComponentParagraph(emblem.snapshot, "NATIONAL_EMBLEM", rule);
      if (emblemIssues.length > 0) {
        addResult("header.national_emblem", "header", "Quốc hiệu", "FAIL", {
          message: emblemIssues[0].message,
          targetId: emblem.snapshot.id,
          issues: emblemIssues,
        });
      } else {
        addResult("header.national_emblem", "header", "Quốc hiệu", "PASS");
      }
    }
  }

  // 2.2 Motto
  if (family === "PARTY") {
    addResult("header.motto", "header", "Tiêu ngữ", "NOT_APPLICABLE");
  } else {
    const motto = componentByType.get("MOTTO");
    if (!motto) {
      const issue: ValidationIssue = {
        id: "missing-motto",
        ruleId: "component.MOTTO.missing",
        targetId: "missing:motto",
        message: "[Tiêu ngữ] Thiếu Tiêu ngữ 'Độc lập - Tự do - Hạnh phúc'",
        severity: "error",
        autoFixable: false,
        actual: "Không có",
        expected: "Độc lập - Tự do - Hạnh phúc",
      };
      addResult("header.motto", "header", "Tiêu ngữ", "MISSING", {
        message: issue.message,
        targetId: issue.targetId,
        issues: [issue],
      });
    } else {
      const rule = getComponentRule(profileId, "MOTTO");
      const mottoIssues = validateComponentParagraph(motto.snapshot, "MOTTO", rule);
      if (mottoIssues.length > 0) {
        addResult("header.motto", "header", "Tiêu ngữ", "FAIL", {
          message: mottoIssues[0].message,
          targetId: motto.snapshot.id,
          issues: mottoIssues,
        });
      } else {
        addResult("header.motto", "header", "Tiêu ngữ", "PASS");
      }
    }
  }

  // 2.3 Party Title
  if (family === "ADMINISTRATIVE") {
    addResult("header.party_title", "header", "Tiêu đề Đảng", "NOT_APPLICABLE");
  } else {
    const partyTitle = componentByType.get("PARTY_TITLE");
    if (!partyTitle) {
      const issue: ValidationIssue = {
        id: "missing-party-title",
        ruleId: "component.PARTY_TITLE.missing",
        targetId: "missing:party_title",
        message: "[Tiêu đề Đảng] Thiếu tiêu đề 'ĐẢNG CỘNG SẢN VIỆT NAM'",
        severity: "error",
        autoFixable: false,
        actual: "Không có",
        expected: "ĐẢNG CỘNG SẢN VIỆT NAM",
      };
      addResult("header.party_title", "header", "Tiêu đề Đảng", "MISSING", {
        message: issue.message,
        targetId: issue.targetId,
        issues: [issue],
      });
    } else {
      const rule = getComponentRule(profileId, "PARTY_TITLE");
      const partyIssues = validateComponentParagraph(partyTitle.snapshot, "PARTY_TITLE", rule);
      if (partyIssues.length > 0) {
        addResult("header.party_title", "header", "Tiêu đề Đảng", "FAIL", {
          message: partyIssues[0].message,
          targetId: partyTitle.snapshot.id,
          issues: partyIssues,
        });
      } else {
        addResult("header.party_title", "header", "Tiêu đề Đảng", "PASS");
      }
    }
  }

  // 2.4 Agency Name
  const agency = componentByType.get("AGENCY_NAME");
  if (!agency) {
    const issue: ValidationIssue = {
      id: "missing-agency-name",
      ruleId: "component.AGENCY_NAME.missing",
      targetId: "missing:agency_name",
      message: "[Tên cơ quan] Thiếu Tên cơ quan, đơn vị ban hành",
      severity: "error",
      autoFixable: false,
      actual: "Không có",
      expected: "Tên cơ quan ban hành văn bản",
    };
    addResult("header.agency_name", "header", "Tên cơ quan ban hành", "MISSING", {
      message: issue.message,
      targetId: issue.targetId,
      issues: [issue],
    });
  } else {
    const rule = getComponentRule(profileId, "AGENCY_NAME");
    const agencyIssues = validateComponentParagraph(agency.snapshot, "AGENCY_NAME", rule);
    if (agencyIssues.length > 0) {
      addResult("header.agency_name", "header", "Tên cơ quan ban hành", "FAIL", {
        message: agencyIssues[0].message,
        targetId: agency.snapshot.id,
        issues: agencyIssues,
      });
    } else {
      addResult("header.agency_name", "header", "Tên cơ quan ban hành", "PASS");
    }
  }

  // --- 3. SYMBOL & DATE RULES (2 rules) ---
  // 3.1 Number / Symbol
  const numSymbol = componentByType.get("NUMBER_SYMBOL");
  if (!numSymbol) {
    const issue: ValidationIssue = {
      id: "missing-number-symbol",
      ruleId: "component.NUMBER_SYMBOL.missing",
      targetId: "missing:number_symbol",
      message: "[Số, ký hiệu] Thiếu Số và ký hiệu văn bản",
      severity: "error",
      autoFixable: false,
      actual: "Không có",
      expected: "Số: .../...",
    };
    addResult("symbol_date.number_symbol", "symbol_date", "Số, ký hiệu văn bản", "MISSING", {
      message: issue.message,
      targetId: issue.targetId,
      issues: [issue],
    });
  } else {
    const rule = getComponentRule(profileId, "NUMBER_SYMBOL");
    const issues = validateComponentParagraph(numSymbol.snapshot, "NUMBER_SYMBOL", rule);
    if (issues.length > 0) {
      addResult("symbol_date.number_symbol", "symbol_date", "Số, ký hiệu văn bản", "FAIL", {
        message: issues[0].message,
        targetId: numSymbol.snapshot.id,
        issues,
      });
    } else {
      addResult("symbol_date.number_symbol", "symbol_date", "Số, ký hiệu văn bản", "PASS");
    }
  }

  // 3.2 Place / Date
  const placeDate = componentByType.get("PLACE_DATE");
  if (!placeDate) {
    const issue: ValidationIssue = {
      id: "missing-place-date",
      ruleId: "component.PLACE_DATE.missing",
      targetId: "missing:place_date",
      message: "[Địa danh, ngày tháng] Thiếu Địa danh và ngày tháng ban hành",
      severity: "error",
      autoFixable: false,
      actual: "Không có",
      expected: "..., ngày ... tháng ... năm ...",
    };
    addResult("symbol_date.place_date", "symbol_date", "Địa danh và ngày tháng", "MISSING", {
      message: issue.message,
      targetId: issue.targetId,
      issues: [issue],
    });
  } else {
    const rule = getComponentRule(profileId, "PLACE_DATE");
    const issues = validateComponentParagraph(placeDate.snapshot, "PLACE_DATE", rule);
    if (issues.length > 0) {
      addResult("symbol_date.place_date", "symbol_date", "Địa danh và ngày tháng", "FAIL", {
        message: issues[0].message,
        targetId: placeDate.snapshot.id,
        issues,
      });
    } else {
      addResult("symbol_date.place_date", "symbol_date", "Địa danh và ngày tháng", "PASS");
    }
  }

  // --- 4. TITLE & ABSTRACT RULES (3 rules) ---
  // 4.1 Document Type
  const docTypeComp = componentByType.get("DOCUMENT_TYPE");
  if (!docTypeComp) {
    const issue: ValidationIssue = {
      id: "missing-document-type",
      ruleId: "component.DOCUMENT_TYPE.missing",
      targetId: "missing:document_type",
      message: "[Tên loại văn bản] Thiếu Tên loại văn bản (QUYẾT ĐỊNH, THÔNG BÁO...)",
      severity: "warning",
      autoFixable: false,
      actual: "Không có",
      expected: "Tên loại văn bản in hoa",
    };
    addResult("title.document_type", "title", "Tên loại văn bản", "MISSING", {
      message: issue.message,
      targetId: issue.targetId,
      issues: [issue],
    });
  } else {
    const rule = getComponentRule(profileId, "DOCUMENT_TYPE");
    const issues = validateComponentParagraph(docTypeComp.snapshot, "DOCUMENT_TYPE", rule);
    if (issues.length > 0) {
      addResult("title.document_type", "title", "Tên loại văn bản", "FAIL", {
        message: issues[0].message,
        targetId: docTypeComp.snapshot.id,
        issues,
      });
    } else {
      addResult("title.document_type", "title", "Tên loại văn bản", "PASS");
    }
  }

  // 4.2 Abstract
  const abstractComp = componentByType.get("ABSTRACT");
  if (!abstractComp) {
    const issue: ValidationIssue = {
      id: "missing-abstract",
      ruleId: "component.ABSTRACT.missing",
      targetId: "missing:abstract",
      message: "[Trích yếu] Thiếu Trích yếu nội dung văn bản",
      severity: "warning",
      autoFixable: false,
      actual: "Không có",
      expected: "Trích yếu nội dung văn bản",
    };
    addResult("title.abstract", "title", "Trích yếu nội dung", "MISSING", {
      message: issue.message,
      targetId: issue.targetId,
      issues: [issue],
    });
  } else {
    const rule = getComponentRule(profileId, "ABSTRACT");
    const issues = validateComponentParagraph(abstractComp.snapshot, "ABSTRACT", rule);
    if (issues.length > 0) {
      addResult("title.abstract", "title", "Trích yếu nội dung", "FAIL", {
        message: issues[0].message,
        targetId: abstractComp.snapshot.id,
        issues,
      });
    } else {
      addResult("title.abstract", "title", "Trích yếu nội dung", "PASS");
    }
  }

  // 4.3 Horizontal Rule (dưới trích yếu / tiêu đề)
  if (horizontalRuleSnapshot) {
    const hRuleIssues = validateHorizontalRuleSnapshot(horizontalRuleSnapshot);
    if (!horizontalRuleSnapshot.exists) {
      addResult("title.horizontal_rule", "title", "Đường kẻ trích yếu", "MISSING", {
        message: "Thiếu đường kẻ phân cách trích yếu văn bản",
        targetId: "missing:horizontal_rule",
        issues: hRuleIssues,
      });
    } else if (hRuleIssues.length > 0) {
      addResult("title.horizontal_rule", "title", "Đường kẻ trích yếu", "FAIL", {
        message: hRuleIssues[0].message,
        targetId: "horizontal:TITLE_ABSTRACT",
        issues: hRuleIssues,
      });
    } else {
      addResult("title.horizontal_rule", "title", "Đường kẻ trích yếu", "PASS");
    }
  } else if (!docTypeComp && !abstractComp) {
    addResult("title.horizontal_rule", "title", "Đường kẻ trích yếu", "NOT_APPLICABLE");
  } else {
    // If not detected via snapshot, mark as NOT_APPLICABLE or PASS if no explicit check possible
    addResult("title.horizontal_rule", "title", "Đường kẻ trích yếu", "NOT_APPLICABLE");
  }

  // --- 5. RECIPIENTS RULES (2 rules) ---
  // 5.1 Addressee (Kính gửi)
  const addresseeComp = componentByType.get("ADDRESSEE");
  if (!addresseeComp) {
    if (isCongVanOrToTrinh) {
      const issue: ValidationIssue = {
        id: "missing-addressee",
        ruleId: "component.ADDRESSEE.missing",
        targetId: "missing:addressee",
        message: "[Kính gửi] Thiếu mục 'Kính gửi' trong Công văn / Tờ trình",
        severity: "error",
        autoFixable: false,
        actual: "Không có",
        expected: "Kính gửi: ...",
      };
      addResult("recipients.addressee", "recipients", "Kính gửi", "MISSING", {
        message: issue.message,
        targetId: issue.targetId,
        issues: [issue],
      });
    } else {
      addResult("recipients.addressee", "recipients", "Kính gửi", "NOT_APPLICABLE");
    }
  } else {
    const addresseeIssues = validateAddresseeBlock(
      paragraphSnapshots,
      addresseeComp.index,
      profileId,
      (snapshot) => validateComponentParagraph(snapshot, "ADDRESSEE", getComponentRule(profileId, "ADDRESSEE")),
    );
    if (addresseeIssues.length > 0) {
      addResult("recipients.addressee", "recipients", "Kính gửi", "FAIL", {
        message: addresseeIssues[0].message,
        targetId: addresseeComp.snapshot.id,
        issues: addresseeIssues,
      });
    } else {
      addResult("recipients.addressee", "recipients", "Kính gửi", "PASS");
    }
  }

  // 5.2 Recipients (Nơi nhận)
  if (!recipientsComp) {
    const issue: ValidationIssue = {
      id: "missing-recipients",
      ruleId: "component.RECIPIENTS.missing",
      targetId: "missing:recipients",
      message: "[Nơi nhận] Thiếu mục 'Nơi nhận' ở cuối văn bản",
      severity: "error",
      autoFixable: false,
      actual: "Không có",
      expected: "Nơi nhận: ...",
    };
    addResult("recipients.recipients", "recipients", "Nơi nhận", "MISSING", {
      message: issue.message,
      targetId: issue.targetId,
      issues: [issue],
    });
  } else {
    const recipientsIssues = validateRecipientsBlock(
      paragraphSnapshots,
      recipientsComp.index,
      (snapshot) => validateComponentParagraph(snapshot, "RECIPIENTS", getRecipientsItemRule(profileId)),
    );
    if (recipientsIssues.length > 0) {
      addResult("recipients.recipients", "recipients", "Nơi nhận", "FAIL", {
        message: recipientsIssues[0].message,
        targetId: recipientsComp.snapshot.id,
        issues: recipientsIssues,
      });
    } else {
      addResult("recipients.recipients", "recipients", "Nơi nhận", "PASS");
    }
  }

  // --- 6. BODY FORMATTING RULES (7 rules) ---
  if (bodyParagraphs.length === 0) {
    const bodyRules = [
      { id: "body.fontName", title: "Phông chữ nội dung (Times New Roman)" },
      { id: "body.fontSize", title: "Cỡ chữ nội dung (13-14pt)" },
      { id: "body.alignment", title: "Căn lề nội dung (Justified)" },
      { id: "body.firstLineIndent", title: "Thụt lề đầu dòng (10-12.7mm)" },
      { id: "body.spaceBefore", title: "Khoảng cách trước đoạn (spaceBefore)" },
      { id: "body.spaceAfter", title: "Khoảng cách sau đoạn (spaceAfter)" },
      { id: "body.lineSpacing", title: "Giãn dòng nội dung (1.2-1.5 lines)" },
    ];
    for (const r of bodyRules) {
      addResult(r.id, "body", r.title, "MISSING", {
        message: "Chưa có đoạn nội dung văn bản nào để kiểm tra thể thức",
      });
    }
  } else {
    // 6.1 fontName
    const fontViolations: ValidationIssue[] = [];
    for (const p of bodyParagraphs) {
      if (profile.body.fontName && p.fontName !== profile.body.fontName) {
        fontViolations.push({
          id: `${p.id}-fontName`,
          ruleId: "body.fontName",
          targetId: p.id,
          message: `Sai phông chữ: "${p.fontName}" (yêu cầu "${profile.body.fontName}")`,
          severity: "error",
          autoFixable: true,
          actual: p.fontName,
          expected: profile.body.fontName,
          fixValue: profile.body.fontName,
        });
      }
    }
    if (fontViolations.length > 0) {
      addResult("body.fontName", "body", "Phông chữ nội dung (Times New Roman)", "FAIL", {
        message: fontViolations[0].message,
        targetId: fontViolations[0].targetId,
        issues: fontViolations,
      });
    } else {
      addResult("body.fontName", "body", "Phông chữ nội dung (Times New Roman)", "PASS");
    }

    // 6.2 fontSize
    const sizeViolations: ValidationIssue[] = [];
    for (const p of bodyParagraphs) {
      if (profile.body.fontSize !== undefined && (p.fontSize < 13 || p.fontSize > 14)) {
        sizeViolations.push({
          id: `${p.id}-fontSize`,
          ruleId: "body.fontSize",
          targetId: p.id,
          message: `Sai cỡ chữ: ${p.fontSize}pt (yêu cầu 13-14pt)`,
          severity: "error",
          autoFixable: true,
          actual: p.fontSize,
          expected: "13-14",
          fixValue: profile.body.fontSize,
        });
      }
    }
    if (sizeViolations.length > 0) {
      addResult("body.fontSize", "body", "Cỡ chữ nội dung (13-14pt)", "FAIL", {
        message: sizeViolations[0].message,
        targetId: sizeViolations[0].targetId,
        issues: sizeViolations,
      });
    } else {
      addResult("body.fontSize", "body", "Cỡ chữ nội dung (13-14pt)", "PASS");
    }

    // 6.3 alignment
    const alignViolations: ValidationIssue[] = [];
    for (const p of bodyParagraphs) {
      if (profile.body.alignment && p.alignment !== profile.body.alignment) {
        alignViolations.push({
          id: `${p.id}-alignment`,
          ruleId: "body.alignment",
          targetId: p.id,
          message: `Sai căn lề: ${p.alignment} (yêu cầu ${profile.body.alignment})`,
          severity: "error",
          autoFixable: true,
          actual: p.alignment,
          expected: profile.body.alignment,
          fixValue: profile.body.alignment,
        });
      }
    }
    if (alignViolations.length > 0) {
      addResult("body.alignment", "body", "Căn lề nội dung (Justified)", "FAIL", {
        message: alignViolations[0].message,
        targetId: alignViolations[0].targetId,
        issues: alignViolations,
      });
    } else {
      addResult("body.alignment", "body", "Căn lề nội dung (Justified)", "PASS");
    }

    // 6.4 firstLineIndent
    const indentViolations: ValidationIssue[] = [];
    for (const p of bodyParagraphs) {
      if (profile.body.firstLineIndentMm !== undefined && p.firstLineIndentMm !== undefined) {
        if (p.firstLineIndentMm < 9 || p.firstLineIndentMm > 13) {
          indentViolations.push({
            id: `${p.id}-firstLineIndent`,
            ruleId: "body.firstLineIndentMm",
            targetId: p.id,
            message: `Sai thụt đầu dòng: ${p.firstLineIndentMm}mm (yêu cầu 10-12.7mm)`,
            severity: "error",
            autoFixable: true,
            actual: p.firstLineIndentMm,
            expected: "10-12.7mm",
            fixValue: profile.body.firstLineIndentMm,
          });
        }
      }
    }
    if (indentViolations.length > 0) {
      addResult("body.firstLineIndent", "body", "Thụt lề đầu dòng (10-12.7mm)", "FAIL", {
        message: indentViolations[0].message,
        targetId: indentViolations[0].targetId,
        issues: indentViolations,
      });
    } else {
      addResult("body.firstLineIndent", "body", "Thụt lề đầu dòng (10-12.7mm)", "PASS");
    }

    // 6.5 spaceBefore
    const beforeViolations: ValidationIssue[] = [];
    for (const p of bodyParagraphs) {
      if (profile.body.spaceBefore !== undefined && p.spaceBefore !== undefined && p.spaceBefore > 6) {
        beforeViolations.push({
          id: `${p.id}-spaceBefore`,
          ruleId: "body.spaceBefore",
          targetId: p.id,
          message: `Sai khoảng cách trước đoạn: ${p.spaceBefore}pt (yêu cầu 0-6pt)`,
          severity: "error",
          autoFixable: true,
          actual: p.spaceBefore,
          expected: "0-6pt",
          fixValue: profile.body.spaceBefore,
        });
      }
    }
    if (beforeViolations.length > 0) {
      addResult("body.spaceBefore", "body", "Khoảng cách trước đoạn (spaceBefore)", "FAIL", {
        message: beforeViolations[0].message,
        targetId: beforeViolations[0].targetId,
        issues: beforeViolations,
      });
    } else {
      addResult("body.spaceBefore", "body", "Khoảng cách trước đoạn (spaceBefore)", "PASS");
    }

    // 6.6 spaceAfter
    const afterViolations: ValidationIssue[] = [];
    for (const p of bodyParagraphs) {
      if (profile.body.spaceAfter !== undefined && p.spaceAfter !== undefined && p.spaceAfter > 6) {
        afterViolations.push({
          id: `${p.id}-spaceAfter`,
          ruleId: "body.spaceAfter",
          targetId: p.id,
          message: `Sai khoảng cách sau đoạn: ${p.spaceAfter}pt (yêu cầu 0-6pt)`,
          severity: "error",
          autoFixable: true,
          actual: p.spaceAfter,
          expected: "0-6pt",
          fixValue: profile.body.spaceAfter,
        });
      }
    }
    if (afterViolations.length > 0) {
      addResult("body.spaceAfter", "body", "Khoảng cách sau đoạn (spaceAfter)", "FAIL", {
        message: afterViolations[0].message,
        targetId: afterViolations[0].targetId,
        issues: afterViolations,
      });
    } else {
      addResult("body.spaceAfter", "body", "Khoảng cách sau đoạn (spaceAfter)", "PASS");
    }

    // 6.7 lineSpacing
    const spacingViolations: ValidationIssue[] = [];
    for (const p of bodyParagraphs) {
      if (profile.body.lineSpacingMultiple !== undefined && p.lineSpacingMultiple !== undefined) {
        if (p.lineSpacingMultiple < 1.0 || p.lineSpacingMultiple > 1.6) {
          spacingViolations.push({
            id: `${p.id}-lineSpacingMultiple`,
            ruleId: "body.lineSpacingMultiple",
            targetId: p.id,
            message: `Sai giãn dòng: ${p.lineSpacingMultiple} (yêu cầu 1.2-1.5)`,
            severity: "error",
            autoFixable: true,
            actual: p.lineSpacingMultiple,
            expected: "1.2-1.5",
            fixValue: profile.body.lineSpacingMultiple,
          });
        }
      }
    }
    if (spacingViolations.length > 0) {
      addResult("body.lineSpacing", "body", "Giãn dòng nội dung (1.2-1.5 lines)", "FAIL", {
        message: spacingViolations[0].message,
        targetId: spacingViolations[0].targetId,
        issues: spacingViolations,
      });
    } else {
      addResult("body.lineSpacing", "body", "Giãn dòng nội dung (1.2-1.5 lines)", "PASS");
    }
  }

  // --- 7. SIGNER RULES (2 rules) ---
  // 7.1 Signer Role
  const signerRole = componentByType.get("SIGNER_ROLE");
  if (!signerRole) {
    const issue: ValidationIssue = {
      id: "missing-signer-role",
      ruleId: "component.SIGNER_ROLE.missing",
      targetId: "missing:signer_role",
      message: "[Quyền hạn/Chức vụ] Thiếu Chức vụ người ký (GIÁM ĐỐC, CHỦ TỊCH...)",
      severity: "error",
      autoFixable: false,
      actual: "Không có",
      expected: "Quyền hạn / Chức vụ người ký",
    };
    addResult("signer.role", "signer", "Chức vụ người ký", "MISSING", {
      message: issue.message,
      targetId: issue.targetId,
      issues: [issue],
    });
  } else {
    const rule = getComponentRule(profileId, "SIGNER_ROLE");
    const issues = validateComponentParagraph(signerRole.snapshot, "SIGNER_ROLE", rule);
    if (issues.length > 0) {
      addResult("signer.role", "signer", "Chức vụ người ký", "FAIL", {
        message: issues[0].message,
        targetId: signerRole.snapshot.id,
        issues,
      });
    } else {
      addResult("signer.role", "signer", "Chức vụ người ký", "PASS");
    }
  }

  // 7.2 Signer Name
  if (!signerRole) {
    const issue: ValidationIssue = {
      id: "missing-signer-name",
      ruleId: "signer.name.missing",
      targetId: "missing:signer_name",
      message: "[Họ tên người ký] Thiếu Họ tên người ký ở cuối văn bản",
      severity: "error",
      autoFixable: false,
      actual: "Không có",
      expected: "Họ và tên người ký",
    };
    addResult("signer.name", "signer", "Họ tên người ký", "MISSING", {
      message: issue.message,
      targetId: issue.targetId,
      issues: [issue],
    });
  } else {
    // Check paragraph after signer role
    const signerIndex = signerRole.index;
    const nameSnapshot = paragraphSnapshots.slice(signerIndex + 1, signerIndex + 4).find((p) => p.text && p.text.trim().length > 0);
    if (!nameSnapshot) {
      const issue: ValidationIssue = {
        id: "missing-signer-name",
        ruleId: "signer.name.missing",
        targetId: "missing:signer_name",
        message: "[Họ tên người ký] Thiếu Họ tên người ký sau chức vụ",
        severity: "error",
        autoFixable: false,
        actual: "Không có",
        expected: "Họ và tên người ký",
      };
      addResult("signer.name", "signer", "Họ tên người ký", "MISSING", {
        message: issue.message,
        targetId: issue.targetId,
        issues: [issue],
      });
    } else {
      // Validate signer name formatting (Times New Roman, bold, size 13-14)
      const nameIssues: ValidationIssue[] = [];
      if (nameSnapshot.fontName !== "Times New Roman") {
        nameIssues.push({
          id: `${nameSnapshot.id}-signer-font`,
          ruleId: "signer.name.font",
          targetId: nameSnapshot.id,
          message: "Họ tên người ký sai phông chữ (yêu cầu Times New Roman)",
          severity: "error",
          autoFixable: true,
          actual: nameSnapshot.fontName,
          expected: "Times New Roman",
          fixValue: "Times New Roman",
        });
      }
      if (nameSnapshot.fontSize < 13 || nameSnapshot.fontSize > 14) {
        nameIssues.push({
          id: `${nameSnapshot.id}-signer-size`,
          ruleId: "signer.name.size",
          targetId: nameSnapshot.id,
          message: "Họ tên người ký sai cỡ chữ (yêu cầu 13-14pt)",
          severity: "error",
          autoFixable: true,
          actual: nameSnapshot.fontSize,
          expected: "13-14",
          fixValue: 13,
        });
      }
      if (!nameSnapshot.bold) {
        nameIssues.push({
          id: `${nameSnapshot.id}-signer-bold`,
          ruleId: "signer.name.bold",
          targetId: nameSnapshot.id,
          message: "Họ tên người ký phải in đậm",
          severity: "error",
          autoFixable: true,
          actual: false,
          expected: true,
          fixValue: true,
        });
      }
      if (nameIssues.length > 0) {
        addResult("signer.name", "signer", "Họ tên người ký", "FAIL", {
          message: nameIssues[0].message,
          targetId: nameSnapshot.id,
          issues: nameIssues,
        });
      } else {
        addResult("signer.name", "signer", "Họ tên người ký", "PASS");
      }
    }
  }

  // --- 8. LEGAL BASIS RULE (1 rule, optional or for Quyết định) ---
  const firstLegalBasis = components.find((c) => c.type === "LEGAL_BASIS");
  if (firstLegalBasis) {
    const basisIssues = validateLegalBasisBlock(paragraphSnapshots, firstLegalBasis.paragraphIndex, profileId);
    if (basisIssues.length > 0) {
      addResult("body.legal_basis", "body", "Căn cứ ban hành", "FAIL", {
        message: basisIssues[0].message,
        targetId: paragraphSnapshots[firstLegalBasis.paragraphIndex]?.id,
        issues: basisIssues,
      });
    } else {
      addResult("body.legal_basis", "body", "Căn cứ ban hành", "PASS");
    }
  } else if (isQuyetDinh) {
    const issue: ValidationIssue = {
      id: "missing-legal-basis",
      ruleId: "body.legal_basis.missing",
      targetId: "missing:legal_basis",
      message: "[Căn cứ ban hành] Quyết định cần có các căn cứ ban hành",
      severity: "warning",
      autoFixable: false,
      actual: "Không có",
      expected: "Căn cứ ...;",
    };
    addResult("body.legal_basis", "body", "Căn cứ ban hành", "MISSING", {
      message: issue.message,
      targetId: issue.targetId,
      issues: [issue],
    });
  } else {
    addResult("body.legal_basis", "body", "Căn cứ ban hành", "NOT_APPLICABLE");
  }

  // Calculate aggregation
  const totalRules = results.length;
  const passedRules = results.filter((r) => r.status === "PASS").length;
  const failedRules = results.filter((r) => r.status === "FAIL").length;
  const missingRules = results.filter((r) => r.status === "MISSING").length;
  const notApplicableRules = results.filter((r) => r.status === "NOT_APPLICABLE").length;
  const applicableRules = totalRules - notApplicableRules;

  const healthScore = applicableRules > 0 ? Math.round((passedRules / applicableRules) * 100) : 0;

  return {
    isBlankDocument: false,
    totalRules,
    applicableRules,
    passedRules,
    failedRules,
    missingRules,
    notApplicableRules,
    healthScore,
    results,
    issues: allIssues,
  };
}
