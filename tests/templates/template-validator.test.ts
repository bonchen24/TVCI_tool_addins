import { validateTemplateCandidate, type TemplateCandidateInput } from "../../src/templates/template-validator";

describe("template-validator service", () => {
  test("validates valid candidate successfully", () => {
    const candidate: TemplateCandidateInput = {
      name: "Phiếu yêu cầu kiểm định",
      organization: "TVCI",
      department: "Phòng Thử nghiệm",
      documentType: "Phiếu yêu cầu",
      fields: [
        { tag: "TEN_KHACH_HANG", label: "Tên khách hàng", type: "text", required: true },
        { tag: "NGAY_YEU_CAU", label: "Ngày yêu cầu", type: "date" },
        {
          tag: "LOAI_DICH_VU",
          label: "Loại dịch vụ",
          type: "select",
          options: [{ label: "Thử nghiệm", value: "TN" }, { label: "Kiểm định", value: "KD" }],
        },
      ],
      docxBuffer: new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x00]).buffer,
    };

    const result = validateTemplateCandidate(candidate);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("rejects empty or too short name", () => {
    const candidate: TemplateCandidateInput = {
      name: "  ",
      organization: "TVCI",
      department: "Văn bản chung",
      documentType: "Công văn",
      fields: [],
    };

    const result = validateTemplateCandidate(candidate);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "name")).toBe(true);
  });

  test("rejects invalid organization", () => {
    const candidate: TemplateCandidateInput = {
      name: "Biểu mẫu thử nghiệm",
      // @ts-expect-error testing invalid org
      organization: "UNKNOWN_ORG",
      department: "Văn bản chung",
      documentType: "Công văn",
      fields: [],
    };

    const result = validateTemplateCandidate(candidate);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "organization")).toBe(true);
  });

  test("detects duplicate tags and invalid tag format", () => {
    const candidate: TemplateCandidateInput = {
      name: "Biểu mẫu kiểm tra",
      organization: "IEMM",
      department: "Văn phòng",
      documentType: "Tờ trình",
      fields: [
        { tag: "trường có dấu cách", label: "Tên", type: "text" },
        { tag: "TEN_TRUONG", label: "Trường 1", type: "text" },
        { tag: "TEN_TRUONG", label: "Trường 2", type: "text" },
      ],
    };

    const result = validateTemplateCandidate(candidate);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("trường có dấu cách"))).toBe(true);
    expect(result.errors.some((e) => e.message.includes("TEN_TRUONG"))).toBe(true);
  });

  test("warns when select field has no options", () => {
    const candidate: TemplateCandidateInput = {
      name: "Biểu mẫu tùy chọn",
      organization: "TVCI",
      department: "Văn bản chung",
      documentType: "Báo cáo",
      fields: [
        { tag: "LUA_CHON", label: "Lựa chọn", type: "select", options: [] },
      ],
    };

    const result = validateTemplateCandidate(candidate);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "LUA_CHON")).toBe(true);
  });

  test("detects corrupt or invalid docx buffer", () => {
    const candidate: TemplateCandidateInput = {
      name: "Biểu mẫu với file hỏng",
      organization: "TVCI",
      department: "Văn bản chung",
      documentType: "Công văn",
      fields: [],
      docxBuffer: new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer,
    };

    const result = validateTemplateCandidate(candidate);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "docxBuffer")).toBe(true);
  });
});
