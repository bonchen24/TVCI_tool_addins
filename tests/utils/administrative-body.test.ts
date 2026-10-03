import { sanitizeAdministrativeBody } from "../../src/utils/administrative-body";

test("removes duplicated document header and signature blocks by line", () => {
  const input = [
    "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
    "Độc lập - Tự do - Hạnh phúc",
    "Công ty TNHH ABC",
    "Kính gửi:",
    "Đề nghị đơn vị phối hợp thực hiện công việc.",
    "Nơi nhận:",
    "GIÁM ĐỐC",
    "(Chữ ký, họ và tên, đóng dấu)",
  ].join("\n");
  expect(sanitizeAdministrativeBody(input)).toBe("Đề nghị đơn vị phối hợp thực hiện công việc.");
});

test("preserves valid prose that mentions structural terms", () => {
  const input = "Cơ quan đã gửi kính gửi tài liệu và đề nghị nơi nhận xác nhận; giám đốc sẽ xem xét nội dung.";
  expect(sanitizeAdministrativeBody(input)).toBe(input);
});

test("preserves paragraph breaks in business content", () => {
  expect(sanitizeAdministrativeBody("Đoạn một.\n\nĐoạn hai.")).toBe("Đoạn một.\n\nĐoạn hai.");
});
