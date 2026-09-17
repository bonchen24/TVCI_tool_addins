import { filterTemplateFillFieldsToControls, selectSafeTemplateFills } from "../../src/ai/template-fill";

const controls = [
  { id: 1, tag: "TEN_KHACH_HANG", title: "Tên khách hàng" },
  { id: 2, tag: "MODEL", title: "Model" },
];

test("low-confidence AI values are not written without review", () => {
  expect(selectSafeTemplateFills(controls, [
    { tag: "TEN_KHACH_HANG", value: "Công ty ABC", confidence: 0.95, source: "nguồn" },
    { tag: "MODEL", value: "FTKF35XVMV", confidence: 0.42, source: "suy đoán" },
  ])).toEqual([{ tag: "TEN_KHACH_HANG", value: "Công ty ABC" }]);
});

test("manual review allows a low-confidence value to be applied", () => {
  expect(selectSafeTemplateFills(controls, [
    { tag: "MODEL", value: "FTKF35XVMV", confidence: 0.42, source: "suy đoán", reviewed: true },
  ])).toEqual([{ tag: "MODEL", value: "FTKF35XVMV" }]);
});

test("template fill preview includes every real control when AI omits a field", () => {
  expect(filterTemplateFillFieldsToControls(controls, [
    { tag: "TEN_KHACH_HANG", value: "Công ty ABC", confidence: 0.95, source: "nguồn" },
  ])).toEqual([
    { tag: "TEN_KHACH_HANG", value: "Công ty ABC", confidence: 0.95, source: "nguồn" },
    { tag: "MODEL", value: null, confidence: 0, source: "" },
  ]);
});
