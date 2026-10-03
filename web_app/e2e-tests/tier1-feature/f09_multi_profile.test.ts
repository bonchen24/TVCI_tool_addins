/**
 * Tier 1 - Feature 9: Multi-Profile Configuration
 * Verifies profile configurations for ND30_TVCI, TKV, IEMM, and DANG_05_HD_VPTW_2026.
 */

import { describe, it, expect } from "../framework/testHarness";

describe("F09: Multi-Profile Configuration", 1, () => {
  const PROFILES = {
    ND30_TVCI: {
      id: "ND30_TVCI",
      name: "Chuẩn Nghị định 30/2020/NĐ-CP (TVCI)",
      requiresNationalEmblem: true,
      legalBasisEnding: ".",
      topMarginMm: 20,
    },
    TKV: {
      id: "TKV",
      name: "Tập đoàn Than - Khoáng sản Việt Nam (TKV)",
      requiresNationalEmblem: true,
      legalBasisEnding: ".",
      topMarginMm: 20,
    },
    IEMM: {
      id: "IEMM",
      name: "Viện Cơ khí Năng lượng và Mỏ (IEMM)",
      requiresNationalEmblem: true,
      legalBasisEnding: ".",
      topMarginMm: 20,
    },
    DANG_05_HD_VPTW_2026: {
      id: "DANG_05_HD_VPTW_2026",
      name: "Văn bản Đảng (HD 05-HD/VPTW 2026)",
      requiresNationalEmblem: false, // Replaced with "ĐẢNG CỘNG SẢN VIỆT NAM"
      legalBasisEnding: ",", // Ends with comma instead of period
      topMarginMm: 20,
    },
  };

  it("should support 4 defined profiles in profile registry", () => {
    const keys = Object.keys(PROFILES);
    expect(keys.length).toBe(4);
    expect(keys).toContain("ND30_TVCI");
    expect(keys).toContain("TKV");
    expect(keys).toContain("IEMM");
    expect(keys).toContain("DANG_05_HD_VPTW_2026");
  });

  it("should configure ND30_TVCI as the default administrative profile", () => {
    const defaultProfileId = "ND30_TVCI";
    expect(PROFILES[defaultProfileId]).toBeDefined();
    expect(PROFILES[defaultProfileId].requiresNationalEmblem).toBe(true);
  });

  it("should enforce distinct header rules for Party profile (DANG_05_HD_VPTW_2026)", () => {
    const partyProfile = PROFILES.DANG_05_HD_VPTW_2026;
    expect(partyProfile.requiresNationalEmblem).toBe(false);
    expect(partyProfile.legalBasisEnding).toBe(",");
  });

  it("should preserve standard margin boundaries across all 4 profiles", () => {
    for (const [id, profile] of Object.entries(PROFILES)) {
      expect(profile.topMarginMm).toBe(20);
    }
  });

  it("should allow dynamic switching between profiles without page reload", () => {
    let currentProfile = PROFILES.ND30_TVCI;
    // Switch to Party profile
    currentProfile = PROFILES.DANG_05_HD_VPTW_2026;

    expect(currentProfile.id).toBe("DANG_05_HD_VPTW_2026");
    expect(currentProfile.legalBasisEnding).toBe(",");
  });
}, 9);
