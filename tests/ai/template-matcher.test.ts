import { suggestMatchingTemplates, getPrimaryContentField, mapDraftToFormValues } from "../../src/ai/template-matcher";
import { TEMPLATE_CATALOG } from "../../src/templates/catalog";
import { FORM_SCHEMA_REGISTRY } from "../../src/templates/form-schema";

describe("Template Matcher", () => {
  describe("suggestMatchingTemplates", () => {
    it("suggests 'Tờ trình' when text indicates a proposal or submission", () => {
      const text = "TỜ TRÌNH\nV/v xin phê duyệt chủ trương đầu tư trang thiết bị thí nghiệm kiểm định mỏ năm 2026\nKính gửi: Hội đồng thành viên...";
      const matches = suggestMatchingTemplates(text, TEMPLATE_CATALOG);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].documentType).toBe("Tờ trình");
    });

    it("suggests 'Báo cáo' when text indicates a progress or periodic report", () => {
      const text = "BÁO CÁO\nKết quả thực hiện công tác an toàn vệ sinh lao động quý I năm 2026\nKính gửi: Ban Giám đốc Viện...";
      const matches = suggestMatchingTemplates(text, TEMPLATE_CATALOG);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].documentType).toBe("Báo cáo");
    });

    it("suggests 'Công văn' for general administrative correspondence", () => {
      const text = "Kính gửi: Công ty Than Thống Nhất\nV/v phối hợp khảo sát địa chất công trình...";
      const matches = suggestMatchingTemplates(text, TEMPLATE_CATALOG);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].documentType).toBe("Công văn");
    });

    it("suggests 'Biên bản' when text mentions meeting minutes", () => {
      const text = "BIÊN BẢN HỌP GIAO BAN\nThời gian: 8h30 ngày 15/09/2026\nĐịa điểm: Phòng họp số 1\nThành phần: Chủ trì: Đ/c Viện trưởng...";
      const matches = suggestMatchingTemplates(text, TEMPLATE_CATALOG);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].documentType).toBe("Biên bản");
    });

    it("suggests 'Quyết định' when text mentions decisions and articles", () => {
      const text = "QUYẾT ĐỊNH\nV/v bổ nhiệm chức vụ Trưởng phòng Thí nghiệm\nĐiều 1: Bổ nhiệm ông...";
      const matches = suggestMatchingTemplates(text, TEMPLATE_CATALOG);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].documentType).toBe("Quyết định");
    });
  });

  describe("getPrimaryContentField", () => {
    it("identifies NOI_DUNG for Công văn schema", () => {
      const schema = FORM_SCHEMA_REGISTRY["Công văn"];
      expect(getPrimaryContentField(schema)).toBe("NOI_DUNG");
    });

    it("identifies LY_DO or DE_XUAT_KIEN_NGHI for Tờ trình schema", () => {
      const schema = FORM_SCHEMA_REGISTRY["Tờ trình"];
      const field = getPrimaryContentField(schema);
      expect(["LY_DO", "DE_XUAT_KIEN_NGHI"]).toContain(field);
    });

    it("identifies NOI_DUNG for Báo cáo schema", () => {
      const schema = FORM_SCHEMA_REGISTRY["Báo cáo"];
      expect(getPrimaryContentField(schema)).toBe("NOI_DUNG");
    });

    it("identifies NOI_DUNG_DIEN_BIEN for Biên bản schema", () => {
      const schema = FORM_SCHEMA_REGISTRY["Biên bản"];
      expect(getPrimaryContentField(schema)).toBe("NOI_DUNG_DIEN_BIEN");
    });
  });

  describe("mapDraftToFormValues", () => {
    it("maps drafted content into primary content field and extracts subject if present", () => {
      const schema = FORM_SCHEMA_REGISTRY["Công văn"];
      const draft = "V/v: Triển khai kiểm định thiết bị hầm lò đợt 2\n\nKính gửi: Công ty Than Hòn Gai\n\nNội dung chi tiết về kế hoạch kiểm định các thiết bị tời trục...";
      const values = mapDraftToFormValues(schema, draft);
      expect(values.NOI_DUNG).toContain("Nội dung chi tiết về kế hoạch kiểm định");
      expect(values.TRICH_YEU).toBe("Triển khai kiểm định thiết bị hầm lò đợt 2");
    });

    it("preserves existing field values when mapping", () => {
      const schema = FORM_SCHEMA_REGISTRY["Công văn"];
      const draft = "Nội dung văn bản cần gửi...";
      const existing = { SO_KY_HIEU: "99/CV-VCNM", NGUOI_KY: "Nguyễn Văn A" };
      const values = mapDraftToFormValues(schema, draft, existing);
      expect(values.SO_KY_HIEU).toBe("99/CV-VCNM");
      expect(values.NGUOI_KY).toBe("Nguyễn Văn A");
      expect(values.NOI_DUNG).toBe("Nội dung văn bản cần gửi...");
    });
  });

  describe("decomposeDraftIntoFormFields", () => {
    it("decomposes a full Tờ trình into all corresponding form fields", () => {
      const schema = FORM_SCHEMA_REGISTRY["Tờ trình"];
      const draft = `
TỜ TRÌNH
V/v xin phê duyệt chủ trương mua sắm thiết bị thí nghiệm kiểm định mỏ năm 2026
Số: 45/TTr-VCNM
Hà Nội, ngày 18 tháng 09 năm 2026

Kính gửi: Hội đồng thành viên Viện Cơ khí Năng lượng và Mỏ

Căn cứ Quyết định số 123/QĐ-VCNM ngày 01/01/2024 của Viện trưởng;
Căn cứ nhu cầu kiểm định thiết bị phòng nổ thực tế tại các đơn vị thành viên;

I. Lý do và sự cần thiết:
Hiện nay các thiết bị đo kiểm khí mêtan và áp suất hầm lò đã hoạt động trên 10 năm, độ nhạy suy giảm cần được thay thế để phục vụ công tác an toàn mỏ.

II. Đề xuất và kiến nghị:
Kính đề nghị Hội đồng thành viên xem xét, phê duyệt chủ trương đầu tư mua sắm 02 bộ thiết bị đo kiểm khí đa chỉ tiêu với tổng kinh phí dự kiến 450.000.000 VNĐ.

Người ký:
VIỆN TRƯỞNG
Nguyễn Văn B

Nơi nhận:
- Như trên;
- Ban Giám đốc;
- Lưu: VT, TN.
      `.trim();

      const { decomposeDraftIntoFormFields } = require("../../src/ai/template-matcher");
      const result = decomposeDraftIntoFormFields(schema, draft);
      expect(result.TRICH_YEU).toContain("chủ trương mua sắm thiết bị thí nghiệm kiểm định mỏ");
      expect(result.SO_KY_HIEU).toBe("45/TTr-VCNM");
      expect(result.KINH_GUI).toContain("Hội đồng thành viên");
      expect(Array.isArray(result.CAN_CU)).toBe(true);
      expect((result.CAN_CU as string[]).length).toBe(2);
      expect(result.LY_DO).toContain("Hiện nay các thiết bị đo kiểm khí mêtan");
      expect(result.DE_XUAT_KIEN_NGHI).toContain("Kính đề nghị Hội đồng thành viên xem xét");
      expect(result.NGUOI_KY).toBe("Nguyễn Văn B");
      expect(result.NOI_NHAN).toContain("Lưu: VT");
    });

    it("decomposes a Biên bản into meeting minutes form fields", () => {
      const schema = FORM_SCHEMA_REGISTRY["Biên bản"];
      const draft = `
BIÊN BẢN CUỘC HỌP GIAO BAN
Thời gian: 08 giờ 30 phút, ngày 16 tháng 09 năm 2026
Địa điểm: Phòng họp tầng 3, Viện Cơ khí Năng lượng và Mỏ
Chủ trì: Ông Trần Văn C - Viện trưởng
Thư ký: Bà Lê Thị D - Chuyên viên Văn phòng
Thành phần tham dự:
- Ban Giám đốc Viện
- Lãnh đạo các Phòng ban, Trung tâm TVCI

I. Nội dung diễn biến:
Hội nghị đã nghe báo cáo tiến độ các hợp đồng tư vấn thiết kế và thử nghiệm thiết bị quý III năm 2026. Các đơn vị đã thảo luận về vướng mắc tiến độ tại mỏ than Khe Chàm.

II. Kết luận:
1. Giao Trung tâm TVCI hoàn thiện báo cáo kết quả trước ngày 25/09/2026.
2. Phòng Kế hoạch rà soát thanh quyết toán các hợp đồng tồn đọng.

Người ký:
CHỦ TRÌ
Trần Văn C
      `.trim();

      const { decomposeDraftIntoFormFields } = require("../../src/ai/template-matcher");
      const result = decomposeDraftIntoFormFields(schema, draft);
      expect(result.THOI_GIAN).toContain("08 giờ 30");
      expect(result.DIA_DIEM).toContain("Phòng họp tầng 3");
      expect(result.CHU_TRI).toContain("Trần Văn C");
      expect(result.THU_KY).toContain("Lê Thị D");
      expect(Array.isArray(result.THANH_PHAN)).toBe(true);
      expect(result.NOI_DUNG_DIEN_BIEN).toContain("Hội nghị đã nghe báo cáo tiến độ");
      expect(result.KET_LUAN).toContain("Giao Trung tâm TVCI");
    });
  });
});
