import { resolveSkeletonType, buildHeaderTableOoxml, buildFooterBlockOoxml } from "../../src/word/document-skeleton.service";
import { PRESET_PRESETS } from "../../src/models/document-settings";

const DEFAULT_SETTINGS = PRESET_PRESETS.TVCI;

describe("document-skeleton.service", () => {
  test("resolveSkeletonType maps Vietnamese types correctly", () => {
    expect(resolveSkeletonType("Công văn")).toBe("cong_van");
    expect(resolveSkeletonType("Quyết định ban hành")).toBe("quyet_dinh");
    expect(resolveSkeletonType("Thông báo nội bộ")).toBe("thong_bao");
    expect(resolveSkeletonType("Tờ trình phê duyệt")).toBe("to_trinh");
    expect(resolveSkeletonType("Báo cáo kết quả")).toBe("bao_cao");
    expect(resolveSkeletonType("Biên bản cuộc họp")).toBe("bien_ban");
    expect(resolveSkeletonType("Kế hoạch công tác")).toBe("ke_hoach");
    expect(resolveSkeletonType("Giấy mời họp")).toBe("giay_moi");
    expect(resolveSkeletonType("Văn bản khác")).toBe("cong_van");
  });

  test("buildHeaderTableOoxml contains agency and national motto", () => {
    const xml = buildHeaderTableOoxml(DEFAULT_SETTINGS);
    expect(xml).toContain("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM");
    expect(xml).toContain("Độc lập - Tự do - Hạnh phúc");
    expect(xml).toContain("Số:");
    expect(xml).toContain(DEFAULT_SETTINGS.agency.issuingAgency.toUpperCase());
  });

  test("buildFooterBlockOoxml contains recipients and signer title", () => {
    const xml = buildFooterBlockOoxml(DEFAULT_SETTINGS);
    expect(xml).toContain("Nơi nhận:");
    expect(xml).toContain(DEFAULT_SETTINGS.signer.title.toUpperCase());
  });
});
