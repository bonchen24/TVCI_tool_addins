import { normalizeControlTag } from "../../src/content-controls/field-map";

test("control tags normalize to uppercase trimmed keys", () => {
  expect(normalizeControlTag(" ten_khach_hang ")).toBe("TEN_KHACH_HANG");
});
