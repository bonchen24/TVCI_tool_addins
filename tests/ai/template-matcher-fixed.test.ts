import { decomposeDraftIntoFormFields } from "../../src/ai/template-matcher";
import { FORM_SCHEMA_REGISTRY } from "../../src/templates/form-schema";

describe("fixed template matcher", () => {
  it("keeps substantive unclaimed sections in Công văn NOI_DUNG", () => {
    const schema = FORM_SCHEMA_REGISTRY["Công văn"];
    const draft = [
      "V/v triển khai rà soát hồ sơ thử nghiệm",
      "",
      "Kính gửi: Công ty A",
      "",
      "Lý do:",
      "Cần rà soát hồ sơ để hoàn thiện đánh giá trước đợt kiểm tra.",
      "",
      "Đề xuất và kiến nghị:",
      "Đề nghị Công ty A gửi bổ sung tài liệu trước ngày 30/09/2026 và phối hợp với Trung tâm trong quá trình rà soát.",
      "",
      "Nơi nhận:",
      "- Như trên;",
      "- Lưu: VT.",
    ].join("\n");

    const result = decomposeDraftIntoFormFields(schema, draft);
    const body = String(result.NOI_DUNG ?? "");
    expect(body).toContain("Cần rà soát hồ sơ");
    expect(body).toContain("gửi bổ sung tài liệu trước ngày 30/09/2026");
    expect(body).not.toContain("Kính gửi:");
    expect(body).not.toContain("Nơi nhận:");
  });

  it("does not duplicate sections that have dedicated Tờ trình fields", () => {
    const schema = FORM_SCHEMA_REGISTRY["Tờ trình"];
    const draft = [
      "Kính gửi: Hội đồng thành viên",
      "",
      "Lý do:",
      "Thiết bị hiện có đã xuống cấp.",
      "",
      "Đề xuất và kiến nghị:",
      "Đề nghị phê duyệt mua sắm thiết bị mới.",
    ].join("\n");

    const result = decomposeDraftIntoFormFields(schema, draft);
    expect(String(result.LY_DO ?? "")).toContain("Thiết bị hiện có");
    expect(String(result.DE_XUAT_KIEN_NGHI ?? "")).toContain("phê duyệt mua sắm");
    const body = String(result.NOI_DUNG ?? "");
    expect(body).not.toContain("Thiết bị hiện có");
    expect(body).not.toContain("phê duyệt mua sắm");
  });
});
