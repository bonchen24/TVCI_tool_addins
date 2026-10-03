/**
 * Tier 4 - Real-World Application Scenarios: Workload 1
 * Real-world Official Dispatch (Công văn TVCI) per Nghị định 30/2020/NĐ-CP
 */

import { describe, it, expect } from "../framework/testHarness";
import { SAMPLE_CONG_VAN_DOC } from "../fixtures/documentFixtures";

describe("Tier 4: Workload - Công văn TVCI (Official Dispatch)", 4, () => {
  it("should validate complete header table structure for TVCI Official Dispatch", () => {
    const headerTable = SAMPLE_CONG_VAN_DOC.content[0];
    expect(headerTable.type).toBe("table");

    const cellAgency = headerTable.content![0].content![0];
    const cellMotto = headerTable.content![0].content![1];

    const agencyText = cellAgency.content?.map((p) => p.text).join("\n") || "";
    const mottoText = cellMotto.content?.map((p) => p.text).join("\n") || "";

    expect(agencyText).toContain("TỔNG CÔNG TY CÔNG NGHIỆP MỎ VIỆT BẮC TKV-CTCP");
    expect(agencyText).toContain("Số: 102/TVCI-VP");
    expect(mottoText).toContain("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM");
    expect(mottoText).toContain("Độc lập - Tự do - Hạnh phúc");
    expect(mottoText).toContain("Hà Nội, ngày 29 tháng 9 năm 2026");
  });

  it("should validate subject line (Trích yếu) formatting: 14pt, centered, bold", () => {
    const subjectNode = SAMPLE_CONG_VAN_DOC.content[1];
    expect(subjectNode.type).toBe("paragraph");
    expect(subjectNode.attrs?.fontSize).toBe(14);
    expect(subjectNode.attrs?.bold).toBe(true);
    expect(subjectNode.attrs?.align).toBe("center");
    expect(subjectNode.text).toContain("V/v báo cáo tiến độ");
  });

  it("should validate Addressee (Kính gửi) format: left aligned, bold", () => {
    const addresseeNode = SAMPLE_CONG_VAN_DOC.content[2];
    expect(addresseeNode.type).toBe("paragraph");
    expect(addresseeNode.attrs?.align).toBe("left");
    expect(addresseeNode.attrs?.bold).toBe(true);
    expect(addresseeNode.text).toContain("Kính gửi: Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam");
  });

  it("should validate body paragraph typography: Times New Roman, 13pt, justified, 10mm indent", () => {
    const bodyNode = SAMPLE_CONG_VAN_DOC.content[3];
    expect(bodyNode.attrs?.fontName).toBe("Times New Roman");
    expect(bodyNode.attrs?.fontSize).toBe(13);
    expect(bodyNode.attrs?.align).toBe("justify");
    expect(bodyNode.attrs?.firstLineIndentMm).toBe(10);
    expect(bodyNode.attrs?.lineSpacing).toBe(1.2);
  });

  it("should validate footer table: recipients list 11pt, signer title centered bold", () => {
    const footerTable = SAMPLE_CONG_VAN_DOC.content[4];
    expect(footerTable.type).toBe("table");

    const leftCell = footerTable.content![0].content![0];
    const rightCell = footerTable.content![0].content![1];

    const recipientItems = leftCell.content!.slice(1);
    for (const rec of recipientItems) {
      expect(rec.attrs?.fontSize).toBe(11);
    }

    const signerRole = rightCell.content![0];
    const signerName = rightCell.content![2];

    expect(signerRole.text).toBe("TỔNG GIÁM ĐỐC");
    expect(signerRole.attrs?.bold).toBe(true);
    expect(signerRole.attrs?.align).toBe("center");
    expect(signerName.text).toBe("Nguyễn Văn An");
  });
});
