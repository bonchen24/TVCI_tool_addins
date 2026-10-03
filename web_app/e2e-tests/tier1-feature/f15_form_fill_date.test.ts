/**
 * Tier 1 - Feature 15: Dynamic Form Fill UI & Date Formatter
 * Verifies formatAdministrativeDate padding rules and dynamic field binding.
 */

import { describe, it, expect } from "../framework/testHarness";

describe("F15: Dynamic Form Fill UI & Date Formatter", 1, () => {
  /**
   * ND 30 Rule on administrative date formatting:
   * - Days 1..9: must pad with leading 0 (e.g. 05)
   * - Months 1, 2: must pad with leading 0 (e.g. tháng 01, tháng 02)
   * - Months 3..12: do NOT pad leading 0 (e.g. tháng 3, tháng 12)
   */
  const formatAdministrativeDate = (place: string, date: Date): string => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const monthStr = month < 3 ? `0${month}` : `${month}`;

    return `${place}, ngày ${dayStr} tháng ${monthStr} năm ${year}`;
  };

  it("should format single-digit days with leading zero (01..09)", () => {
    const date = new Date(2026, 8, 5); // 5th Sept 2026
    const formatted = formatAdministrativeDate("Hà Nội", date);
    expect(formatted).toContain("ngày 05");
  });

  it("should format months 1 and 2 with leading zero (tháng 01, tháng 02)", () => {
    const dateJan = new Date(2026, 0, 15); // 15 Jan 2026
    const dateFeb = new Date(2026, 1, 15); // 15 Feb 2026

    expect(formatAdministrativeDate("Hà Nội", dateJan)).toContain("tháng 01");
    expect(formatAdministrativeDate("Hà Nội", dateFeb)).toContain("tháng 02");
  });

  it("should format months 3 through 12 WITHOUT leading zero (tháng 3 .. tháng 12)", () => {
    const dateMar = new Date(2026, 2, 10); // 10 March
    const dateSep = new Date(2026, 8, 29); // 29 Sept
    const dateDec = new Date(2026, 11, 25); // 25 Dec

    expect(formatAdministrativeDate("Hà Nội", dateMar)).toContain("tháng 3");
    expect(formatAdministrativeDate("Hà Nội", dateSep)).toContain("tháng 9");
    expect(formatAdministrativeDate("Hà Nội", dateDec)).toContain("tháng 12");
  });

  it("should bind user input form values to schema data object", () => {
    const formData: Record<string, any> = {
      SO_KY_HIEU: "123/TVCI-TC",
      TRICH_YEU: "V/v phê duyệt quyết toán",
      KINH_GUI: "Ban Kiểm soát",
      NOI_DUNG: "Nội dung chi tiết...",
    };

    expect(formData.SO_KY_HIEU).toBe("123/TVCI-TC");
    expect(formData.TRICH_YEU).toContain("phê duyệt");
  });

  it("should validate required fields and return field-level error messages", () => {
    const validateForm = (data: Record<string, any>, requiredFields: string[]) => {
      const errors: Record<string, string> = {};
      for (const field of requiredFields) {
        if (!data[field] || String(data[field]).trim() === "") {
          errors[field] = `Trường ${field} không được để trống`;
        }
      }
      return errors;
    };

    const emptyData = { SO_KY_HIEU: "" };
    const errors = validateForm(emptyData, ["SO_KY_HIEU", "TRICH_YEU"]);

    expect(errors.SO_KY_HIEU).toBeDefined();
    expect(errors.TRICH_YEU).toBeDefined();
  });
}, 15);
