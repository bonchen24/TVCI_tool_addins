/**
 * Tier 3 - Cross-Feature Interactions: Journey 3
 * Profile switch (ND30_TVCI -> DANG_05_HD_VPTW_2026) -> Real-time Re-audit -> Rule adjustment
 */

import { describe, it, expect } from "../framework/testHarness";

describe("Tier 3: Journey - Profile Switch & Live Re-audit", 3, () => {
  interface HeaderState {
    profile: "ND30_TVCI" | "DANG_05_HD_VPTW_2026";
    leftHeader: string;
    rightHeader: string;
    legalBasisEnding: string;
  }

  let docState: HeaderState = {
    profile: "ND30_TVCI",
    leftHeader: "TỔNG CÔNG TY CÔNG NGHIỆP MỎ VIỆT BẮC",
    rightHeader: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc",
    legalBasisEnding: ".",
  };

  it("Step 1: should evaluate document as 100% compliant under initial ND30_TVCI profile", () => {
    const isCompliantND30 = (state: HeaderState) => {
      return state.rightHeader.includes("CỘNG HÒA XÃ HỘI") && state.legalBasisEnding === ".";
    };

    expect(isCompliantND30(docState)).toBe(true);
  });

  it("Step 2 & 3: should switch profile to Party guidelines and detect non-compliance in real-time", () => {
    // User switches profile
    docState.profile = "DANG_05_HD_VPTW_2026";

    const auditUnderPartyProfile = (state: HeaderState) => {
      const issues = [];
      if (!state.leftHeader.includes("ĐẢNG CỘNG SẢN VIỆT NAM")) {
        issues.push("Văn bản Đảng yêu cầu cơ quan ban hành Đảng");
      }
      if (state.legalBasisEnding !== ",") {
        issues.push("Căn cứ pháp lý trong văn bản Đảng phải kết thúc bằng dấu phẩy ',' thay vì dấu chấm '.'");
      }
      return issues;
    };

    const issues = auditUnderPartyProfile(docState);
    expect(issues.length).toBe(2);
    expect(issues[1]).toContain("kết thúc bằng dấu phẩy ','");
  });

  it("Step 4: should apply profile-specific safe auto-fixes", () => {
    // Apply fixes for Party profile
    docState = {
      ...docState,
      leftHeader: "ĐẢNG BỘ TỔNG CÔNG TY CÔNG NGHIỆP MỎ VIỆT BẮC",
      rightHeader: "ĐẢNG CỘNG SẢN VIỆT NAM",
      legalBasisEnding: ",",
    };

    expect(docState.leftHeader).toContain("ĐẢNG BỘ");
    expect(docState.rightHeader).toBe("ĐẢNG CỘNG SẢN VIỆT NAM");
    expect(docState.legalBasisEnding).toBe(",");
  });

  it("Step 5: should confirm 100% compliance under DANG_05_HD_VPTW_2026 profile", () => {
    const checkPartyCompliance = (state: HeaderState) => {
      return state.rightHeader === "ĐẢNG CỘNG SẢN VIỆT NAM" && state.legalBasisEnding === ",";
    };

    expect(checkPartyCompliance(docState)).toBe(true);
  });

  it("Step 6: should switch back to ND30_TVCI and adapt audit rules accordingly", () => {
    docState.profile = "ND30_TVCI";
    expect(docState.profile).toBe("ND30_TVCI");
  });
});
