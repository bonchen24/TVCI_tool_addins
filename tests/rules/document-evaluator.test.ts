import { evaluateDocumentRules } from "../../src/rules/document-evaluator";
import type { DocumentEvaluationInput } from "../../src/rules/document-evaluator";
import type { ParagraphSnapshot, PageSetupSnapshot } from "../../src/rules/models";

describe("Document Evaluator Engine (4-State Rules Pipeline)", () => {
  const defaultPage: PageSetupSnapshot = {
    paperSize: "A4",
    orientation: "Portrait",
    topMm: 20,
    bottomMm: 20,
    leftMm: 30,
    rightMm: 15,
  };

  describe("Blank Document Detection", () => {
    it("detects completely empty document with 0 paragraphs", () => {
      const input: DocumentEvaluationInput = {
        profileId: "NĐ30_TVCI",
        validationScope: "document",
        paragraphSnapshots: [],
        pageSnapshot: defaultPage,
      };

      const result = evaluateDocumentRules(input);

      expect(result.isBlankDocument).toBe(true);
      expect(result.passedRules).toBe(0);
      expect(result.applicableRules).toBe(0);
      expect(result.totalRules).toBe(0);
      expect(result.notApplicableRules).toBe(0);
      expect(result.healthScore).toBe(0);
      // Denominator and numerator must never allow 27/27
      expect(result.results.filter((r) => r.status === "PASS")).toHaveLength(0);
    });

    it("detects blank document with only whitespace paragraphs", () => {
      const input: DocumentEvaluationInput = {
        profileId: "NĐ30_TVCI",
        validationScope: "document",
        paragraphSnapshots: [
          {
            id: "doc:p:0",
            text: "   \n\t  ",
            fontName: "Times New Roman",
            fontSize: 13,
            alignment: "Left",
            spaceBefore: 0,
            spaceAfter: 0,
          },
        ],
        pageSnapshot: defaultPage,
      };

      const result = evaluateDocumentRules(input);

      expect(result.isBlankDocument).toBe(true);
      expect(result.passedRules).toBe(0);
      expect(result.applicableRules).toBe(0);
      expect(result.totalRules).toBe(0);
      expect(result.notApplicableRules).toBe(0);
      expect(result.healthScore).toBe(0);
    });
  });

  describe("Incomplete Document (Missing Structural Components)", () => {
    it("marks missing mandatory headers and signatures as MISSING, not PASS", () => {
      // Document only contains 1 body paragraph
      const input: DocumentEvaluationInput = {
        profileId: "NĐ30_TVCI",
        validationScope: "document",
        paragraphSnapshots: [
          {
            id: "doc:p:0",
            text: "Thực hiện kế hoạch sản xuất kinh doanh năm 2026 của đơn vị, chúng tôi xin báo cáo chi tiết như sau.",
            fontName: "Times New Roman",
            fontSize: 13,
            alignment: "Justified",
            spaceBefore: 2,
            spaceAfter: 2,
            firstLineIndentMm: 10,
            lineSpacingPt: 15.6,
            lineSpacingRule: "multiple",
            lineSpacingMultiple: 1.2,
          },
        ],
        pageSnapshot: defaultPage,
      };

      const result = evaluateDocumentRules(input);

      expect(result.isBlankDocument).toBe(false);
      expect(result.missingRules).toBeGreaterThan(0);

      // National Emblem, Motto, Agency Name, Number Symbol, Place/Date, Signer Role must be MISSING
      const missingRuleIds = result.results
        .filter((r) => r.status === "MISSING")
        .map((r) => r.ruleId);

      expect(missingRuleIds).toContain("header.national_emblem");
      expect(missingRuleIds).toContain("header.motto");
      expect(missingRuleIds).toContain("header.agency_name");
      expect(missingRuleIds).toContain("symbol_date.number_symbol");
      expect(missingRuleIds).toContain("symbol_date.place_date");
      expect(missingRuleIds).toContain("signer.role");

      // Body rules should PASS because the single body paragraph has valid formatting
      const bodyFontResult = result.results.find((r) => r.ruleId === "body.fontName");
      expect(bodyFontResult?.status).toBe("PASS");

      // Applicable rules must include MISSING rules in denominator
      expect(result.applicableRules).toBe(result.passedRules + result.failedRules + result.missingRules);
      // Passed rules must NOT count MISSING rules
      expect(result.passedRules).toBeLessThan(result.applicableRules);
      expect(result.healthScore).toBeLessThan(100);
      expect(result.healthScore).toBe(Math.round((result.passedRules / result.applicableRules) * 100));
    });
  });

  describe("Rule Applicability & Denominator Math", () => {
    it("marks Party rules as NOT_APPLICABLE for administrative profiles, excluding them from denominator", () => {
      const input: DocumentEvaluationInput = {
        profileId: "NĐ30_TVCI",
        validationScope: "document",
        paragraphSnapshots: [
          {
            id: "doc:p:0",
            text: "Nội dung văn bản hành chính thông thường.",
            fontName: "Times New Roman",
            fontSize: 13,
            alignment: "Justified",
            spaceBefore: 2,
            spaceAfter: 2,
          },
        ],
        pageSnapshot: defaultPage,
      };

      const result = evaluateDocumentRules(input);
      const partyRule = result.results.find((r) => r.ruleId === "header.party_title");
      expect(partyRule).toBeDefined();
      expect(partyRule?.status).toBe("NOT_APPLICABLE");

      // Total rules = applicableRules + notApplicableRules
      expect(result.totalRules).toBe(result.applicableRules + result.notApplicableRules);
    });

    it("marks National Emblem & Motto as NOT_APPLICABLE for Party profile DANG_05_HD_VPTW_2026", () => {
      const input: DocumentEvaluationInput = {
        profileId: "DANG_05_HD_VPTW_2026",
        validationScope: "document",
        paragraphSnapshots: [
          {
            id: "doc:p:0",
            text: "Nội dung văn bản Đảng.",
            fontName: "Times New Roman",
            fontSize: 13,
            alignment: "Justified",
            spaceBefore: 2,
            spaceAfter: 2,
          },
        ],
        pageSnapshot: defaultPage,
      };

      const result = evaluateDocumentRules(input);
      const emblemRule = result.results.find((r) => r.ruleId === "header.national_emblem");
      const mottoRule = result.results.find((r) => r.ruleId === "header.motto");
      const partyTitleRule = result.results.find((r) => r.ruleId === "header.party_title");

      expect(emblemRule?.status).toBe("NOT_APPLICABLE");
      expect(mottoRule?.status).toBe("NOT_APPLICABLE");
      expect(partyTitleRule?.status).toBe("MISSING"); // Party title is required for Party profile, so MISSING
    });
  });

  describe("Formatting Failures", () => {
    it("marks rule as FAIL when component exists but has wrong formatting", () => {
      const input: DocumentEvaluationInput = {
        profileId: "NĐ30_TVCI",
        validationScope: "document",
        paragraphSnapshots: [
          {
            id: "doc:p:0",
            text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
            fontName: "Arial", // Wrong: must be Times New Roman
            fontSize: 9, // Wrong: must be 12-13
            bold: false, // Wrong: must be bold
            italic: true, // Wrong: must not be italic
            alignment: "Left", // Wrong: must be Centered
            spaceBefore: 0,
            spaceAfter: 0,
          },
        ],
        pageSnapshot: defaultPage,
      };

      const result = evaluateDocumentRules(input);
      const emblemResult = result.results.find((r) => r.ruleId === "header.national_emblem");
      expect(emblemResult?.status).toBe("FAIL");
      expect(result.failedRules).toBeGreaterThan(0);
      expect(result.issues.some((i) => i.ruleId.includes("NATIONAL_EMBLEM"))).toBe(true);
    });
  });

  describe("Complete Valid Administrative Document", () => {
    it("evaluates all valid components to PASS and achieves 100% score", () => {
      const input: DocumentEvaluationInput = {
        profileId: "NĐ30_TVCI",
        validationScope: "document",
        paragraphSnapshots: [
          {
            id: "doc:p:0",
            text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
            fontName: "Times New Roman",
            fontSize: 12,
            bold: true,
            italic: false,
            alignment: "Centered",
            spaceBefore: 0,
            spaceAfter: 0,
          },
          {
            id: "doc:p:1",
            text: "Độc lập - Tự do - Hạnh phúc",
            fontName: "Times New Roman",
            fontSize: 13,
            bold: true,
            italic: false,
            alignment: "Centered",
            spaceBefore: 0,
            spaceAfter: 0,
          },
          {
            id: "doc:p:2",
            text: "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP",
            fontName: "Times New Roman",
            fontSize: 13,
            bold: false,
            italic: false,
            alignment: "Centered",
            spaceBefore: 0,
            spaceAfter: 0,
          },
          {
            id: "doc:p:3",
            text: "Số: 123/TB-TVCI",
            fontName: "Times New Roman",
            fontSize: 13,
            bold: false,
            italic: false,
            alignment: "Centered",
            spaceBefore: 0,
            spaceAfter: 0,
          },
          {
            id: "doc:p:4",
            text: "Hà Nội, ngày 19 tháng 09 năm 2026",
            fontName: "Times New Roman",
            fontSize: 13,
            bold: false,
            italic: true,
            alignment: "Right",
            spaceBefore: 0,
            spaceAfter: 0,
          },
          {
            id: "doc:p:5",
            text: "THÔNG BÁO",
            fontName: "Times New Roman",
            fontSize: 14,
            bold: true,
            italic: false,
            alignment: "Centered",
            spaceBefore: 0,
            spaceAfter: 0,
          },
          {
            id: "doc:p:6",
            text: "Về việc nghiệm thu thử nghiệm",
            fontName: "Times New Roman",
            fontSize: 14,
            bold: true,
            italic: false,
            alignment: "Centered",
            spaceBefore: 0,
            spaceAfter: 0,
          },
          {
            id: "doc:p:7",
            text: "Nơi nhận:\n- Như điều 3;\n- Lưu: VT.",
            fontName: "Times New Roman",
            fontSize: 12,
            bold: false,
            italic: true,
            alignment: "Left",
            spaceBefore: 0,
            spaceAfter: 0,
          },
          {
            id: "doc:p:8",
            text: "Nội dung văn bản thông báo theo đúng quy chuẩn kỹ thuật và thể thức quy định hiện hành.",
            fontName: "Times New Roman",
            fontSize: 13,
            bold: false,
            italic: false,
            alignment: "Justified",
            spaceBefore: 2,
            spaceAfter: 2,
            firstLineIndentMm: 10,
            lineSpacingPt: 15.6,
            lineSpacingRule: "multiple",
            lineSpacingMultiple: 1.2,
          },
          {
            id: "doc:p:9",
            text: "GIÁM ĐỐC",
            fontName: "Times New Roman",
            fontSize: 13,
            bold: true,
            italic: false,
            alignment: "Centered",
            spaceBefore: 0,
            spaceAfter: 0,
          },
          {
            id: "doc:p:10",
            text: "Nguyễn Văn A",
            fontName: "Times New Roman",
            fontSize: 13,
            bold: true,
            italic: false,
            alignment: "Centered",
            spaceBefore: 0,
            spaceAfter: 0,
          },
        ],
        pageSnapshot: defaultPage,
        horizontalRuleSnapshot: {
          kind: "TITLE_ABSTRACT",
          exists: true,
          widthPoints: 120,
          availableWidthPoints: 300,
          expectedTextWidthPoints: 300,
        },
      };

      const result = evaluateDocumentRules(input);

      expect(result.isBlankDocument).toBe(false);
      expect(result.missingRules).toBe(0);
      expect(result.failedRules).toBe(0);
      expect(result.passedRules).toBe(result.applicableRules);
      expect(result.healthScore).toBe(100);
    });
  });

  describe("Test E: Unreadable / Missing Data is NEVER PASS", () => {
    it("does not count page rules as PASS when pageSnapshot is null / unreadable", () => {
      const input: DocumentEvaluationInput = {
        profileId: "NĐ30_TVCI",
        validationScope: "document",
        paragraphSnapshots: [
          {
            id: "doc:p:0",
            text: "Đoạn văn nội dung",
            fontName: "Times New Roman",
            fontSize: 13,
            alignment: "Justified",
            spaceBefore: 2,
            spaceAfter: 2,
          },
        ],
        pageSnapshot: null, // Read failure or unsupported
      };

      const result = evaluateDocumentRules(input);
      const pageResults = result.results.filter((r) => r.category === "page");
      expect(pageResults.length).toBeGreaterThan(0);
      expect(pageResults.every((r) => r.status !== "PASS")).toBe(true);
    });

    it("keeps an unavailable page inspection out of the PASS count", () => {
      const result = evaluateDocumentRules({
        profileId: "NĐ30_TVCI",
        validationScope: "document",
        paragraphSnapshots: [
          {
            id: "doc:p:0",
            text: "Nội dung đã có",
            fontName: "Times New Roman",
            fontSize: 13,
            alignment: "Justified",
            spaceBefore: 2,
            spaceAfter: 2,
          },
        ],
        pageSnapshot: null,
      });

      const pageResults = result.results.filter((r) => r.category === "page");
      expect(pageResults).toHaveLength(6);
      expect(pageResults.some((r) => r.status === "PASS")).toBe(false);
      expect(result.passedRules).toBeLessThan(result.applicableRules);
      expect(result.healthScore).toBe(Math.round((result.passedRules / result.applicableRules) * 100));
    });
  });
});
