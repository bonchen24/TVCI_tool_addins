import { segmentDraftIntoFormValues } from "../../src/ai/template-form";
import { FORM_SCHEMA_REGISTRY } from "../../src/templates/form-schema";

const sampleLetter = `VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN
Số:        /CKNM
V/v thời gian thử nghiệm hiệu suất năng lượng lô hàng tủ kết đông lạnh

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Hà Nội, ngày      tháng      năm 2021

Kính gửi:
- Chi cục Hải quan CK cảng Hải Phòng khu vực I;
- Công ty TNHH ĐT Xuất nhập khẩu Đại Dương.

Ngày 19 tháng 01 năm 2021, Viện Cơ khí Năng lượng và Mỏ - Vinacomin đã tiếp nhận hồ sơ và mẫu thử nghiệm lô hàng 02 chiếc Tủ kết đông lạnh liên hợp nhãn hiệu EUROCOOL, model EURO-415CBG và EURO-498WPM do Công ty TNHH ĐT Xuất nhập khẩu Đại Dương chuyển giao đến phòng thử nghiệm.

Hiện nay, do ảnh hưởng của dịch Covid-19, phòng thử nghiệm của Viện đang áp dụng cơ chế làm việc luân phiên, dẫn đến thời gian thử nghiệm hiệu suất năng lượng của lô hàng nêu trên kéo dài hơn dự kiến. Viện dự kiến sẽ trả kết quả thử nghiệm vào ngày 27 tháng 02 năm 2021.

Viện Cơ khí Năng lượng và Mỏ - Vinacomin trân trọng thông báo để Quý cơ quan và Quý công ty được biết, tạo điều kiện thuận lợi cho việc thực hiện các thủ tục tiếp theo.

Nơi nhận:
- Như trên;
- Lưu: VT.

VIỆN TRƯỞNG`;

const aiExtraction = {
  fields: [
    { tag: "SO_KY_HIEU", value: null, confidence: 1, source: "Số: /CKNM" },
    { tag: "NGAY_BAN_HANH", value: null, confidence: 1, source: "ngày tháng năm 2021" },
    { tag: "TRICH_YEU", value: "thời gian thử nghiệm hiệu suất năng lượng lô hàng tủ kết đông lạnh", confidence: 0.96, source: "V/v thời gian thử nghiệm hiệu suất năng lượng lô hàng tủ kết đông lạnh" },
    { tag: "NOI_NHAN_TRUC_TIEP", value: "Chi cục Hải quan CK cảng Hải Phòng khu vực I;\nCông ty TNHH ĐT Xuất nhập khẩu Đại Dương.", confidence: 0.98, source: "Kính gửi" },
    { tag: "NOI_DUNG", value: "Ngày 19 tháng 01 năm 2021, Viện Cơ khí Năng lượng và Mỏ - Vinacomin đã tiếp nhận hồ sơ và mẫu thử nghiệm lô hàng 02 chiếc Tủ kết đông lạnh liên hợp nhãn hiệu EUROCOOL, model EURO-415CBG và EURO-498WPM do Công ty TNHH ĐT Xuất nhập khẩu Đại Dương chuyển giao đến phòng thử nghiệm.\n\nHiện nay, do ảnh hưởng của dịch Covid-19, phòng thử nghiệm của Viện đang áp dụng cơ chế làm việc luân phiên, dẫn đến thời gian thử nghiệm hiệu suất năng lượng của lô hàng nêu trên kéo dài hơn dự kiến. Viện dự kiến sẽ trả kết quả thử nghiệm vào ngày 27 tháng 02 năm 2021.\n\nViện Cơ khí Năng lượng và Mỏ - Vinacomin trân trọng thông báo để Quý cơ quan và Quý công ty được biết, tạo điều kiện thuận lợi cho việc thực hiện các thủ tục tiếp theo.", confidence: 0.99, source: "Ba đoạn nội dung nghiệp vụ" },
    { tag: "NGUOI_KY", value: null, confidence: 1, source: "Chỉ có chức danh VIỆN TRƯỞNG, không có họ tên" },
    { tag: "NOI_NHAN", value: "Như trên;\nLưu: VT.", confidence: 0.99, source: "Nơi nhận" },
  ],
};

test("AI segments a full official letter into template fields without copying fixed blocks", async () => {
  const request = jest.fn(async (prompt: string) => {
    expect(prompt).toContain("Không đưa quốc hiệu");
    expect(prompt).toContain(sampleLetter);
    return JSON.stringify(aiExtraction);
  });

  const result = await segmentDraftIntoFormValues(
    FORM_SCHEMA_REGISTRY["Công văn"],
    sampleLetter,
    { SO_KY_HIEU: "45/CV-VCNM" },
    request,
  );

  expect(result.error).toBeUndefined();
  expect(result.source).toBe("ai");
  expect(result.values.SO_KY_HIEU).toBe("45/CV-VCNM");
  expect(result.values.TRICH_YEU).toBe("thời gian thử nghiệm hiệu suất năng lượng lô hàng tủ kết đông lạnh");
  expect(result.values.NOI_NHAN_TRUC_TIEP).toBe("Chi cục Hải quan CK cảng Hải Phòng khu vực I;\nCông ty TNHH ĐT Xuất nhập khẩu Đại Dương.");
  expect(result.values.NOI_NHAN).toBe("Như trên;\nLưu: VT.");
  expect(result.values.NGUOI_KY).toBeUndefined();
  expect(result.values.NOI_DUNG).toBe(aiExtraction.fields[4].value);
  expect(String(result.values.NOI_DUNG)).not.toContain("Kính gửi");
  expect(String(result.values.NOI_DUNG)).not.toContain("Nơi nhận");
  expect(String(result.values.NOI_DUNG)).not.toContain("VIỆN TRƯỞNG");
  expect(String(result.values.NOI_DUNG)).not.toContain("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM");
  expect(JSON.stringify(result.values)).not.toContain("TAG_NGOAI_SCHEMA");
});

test("AI segmentation falls back to the current parser and preserves user values when extraction fails", async () => {
  const result = await segmentDraftIntoFormValues(
    FORM_SCHEMA_REGISTRY["Công văn"],
    "V/v: Thời gian thử nghiệm\n\nNội dung nghiệp vụ.",
    { SO_KY_HIEU: "12/CV-VCNM" },
    async () => { throw new Error("AI offline"); },
  );

  expect(result.source).toBe("rules");
  expect(result.error).toContain("AI offline");
  expect(result.values.SO_KY_HIEU).toBe("12/CV-VCNM");
  expect(result.values.TRICH_YEU).toBe("Thời gian thử nghiệm");
  expect(result.values.NOI_DUNG).toBe("Nội dung nghiệp vụ.");
});
