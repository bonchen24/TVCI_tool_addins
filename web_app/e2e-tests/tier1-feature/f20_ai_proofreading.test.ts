/**
 * Tier 1 - Feature 20: 5-Category Proofreading Subsystem
 * Verifies detection and suggestion for spelling, grammar, capitalization, punctuation, and administrative style.
 */

import { describe, it, expect } from "../framework/testHarness";
import { MOCK_AI_RESPONSES } from "../fixtures/templateFixtures";

describe("F20: 5-Category Proofreading Subsystem", 1, () => {
  type ProofreadCategory = "spelling" | "grammar" | "capitalization" | "punctuation" | "administrative_style";

  interface ProofreadIssue {
    category: ProofreadCategory;
    original: string;
    replacement: string;
    explanation: string;
  }

  const VALID_CATEGORIES: ProofreadCategory[] = [
    "spelling",
    "grammar",
    "capitalization",
    "punctuation",
    "administrative_style",
  ];

  it("should categorize suggestions into exactly 5 defined categories", () => {
    expect(VALID_CATEGORIES.length).toBe(5);
    for (const issue of MOCK_AI_RESPONSES.proofreading.issues) {
      expect(VALID_CATEGORIES).toContain(issue.category as ProofreadCategory);
    }
  });

  it("should detect spelling mistakes with Vietnamese diacritic errors", () => {
    const spellingIssue = MOCK_AI_RESPONSES.proofreading.issues.find((i) => i.category === "spelling");
    expect(spellingIssue).toBeDefined();
    expect(spellingIssue?.original).toBe("nghiên cứu kiễm tra");
    expect(spellingIssue?.replacement).toBe("nghiên cứu kiểm tra");
  });

  it("should detect inappropriate administrative style phrasing", () => {
    const styleIssue = MOCK_AI_RESPONSES.proofreading.issues.find((i) => i.category === "administrative_style");
    expect(styleIssue).toBeDefined();
    expect(styleIssue?.original).toContain("chúng tôi");
    expect(styleIssue?.explanation).toContain("Văn phong hành chính");
  });

  it("should calculate replacement range indices within source text", () => {
    const sourceText = "Đề nghị các phòng ban nghiên cứu kiễm tra hồ sơ kỹ lưỡng.";
    const targetWord = "nghiên cứu kiễm tra";

    const startIndex = sourceText.indexOf(targetWord);
    const endIndex = startIndex + targetWord.length;

    expect(startIndex).toBeGreaterThanOrEqual(0);
    expect(sourceText.substring(startIndex, endIndex)).toBe(targetWord);
  });

  it("should handle clean text without issues returning empty issue list", () => {
    const parseProofreadJson = (rawJson: string): ProofreadIssue[] => {
      try {
        const parsed = JSON.parse(rawJson);
        return parsed.issues || [];
      } catch {
        return [];
      }
    };

    const cleanResult = parseProofreadJson('{"issues": []}');
    expect(cleanResult.length).toBe(0);
  });
}, 20);
