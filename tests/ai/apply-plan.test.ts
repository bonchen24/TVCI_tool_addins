import { buildTemplateApplyPlan } from "../../src/ai/apply-plan";
import { getTemplateFormSchemaByDocumentType } from "../../src/templates/form-schema";

describe("template apply plan", () => {
  const decisionSchema = getTemplateFormSchemaByDocumentType("Quyết định");

  test("APPEND adds only new legal bases after section-aware normalization", () => {
    const plan = buildTemplateApplyPlan(
      decisionSchema,
      { CAN_CU: ["Nghị định số 30/2020/NĐ-CP ngày 05/3/2020 của Chính phủ"] },
      { CAN_CU: "Căn cứ Nghị định 30/2020/NĐ-CP ngày 05/3/2020 của Chính phủ\nCăn cứ Luật Ban hành văn bản quy phạm pháp luật" },
      "APPEND",
    );

    expect(plan.values.CAN_CU).toEqual([
      "Nghị định số 30/2020/NĐ-CP ngày 05/3/2020 của Chính phủ",
      "Căn cứ Luật Ban hành văn bản quy phạm pháp luật",
    ]);
  });

  test("FILL_MISSING keeps an existing field untouched", () => {
    const plan = buildTemplateApplyPlan(
      decisionSchema,
      { TRICH_YEU: "V/v đã có nội dung" },
      { TRICH_YEU: "V/v nội dung AI đề xuất", NGUOI_KY: "Nguyễn Văn A" },
      "FILL_MISSING",
    );

    expect(plan.values).toEqual({ NGUOI_KY: "Nguyễn Văn A" });
    expect(plan.items.find((item) => item.tag === "TRICH_YEU")?.reason).toBe("Trường đã có dữ liệu.");
  });

  test("REPLACE produces a changed value and the final values are directly applicable", () => {
    const plan = buildTemplateApplyPlan(
      decisionSchema,
      { TRICH_YEU: "V/v nội dung cũ" },
      { TRICH_YEU: "V/v nội dung mới" },
      "REPLACE",
    );

    expect(plan.values.TRICH_YEU).toBe("V/v nội dung mới");
    expect(plan.items[0].status).toBe("update");
  });

  test("CREATE and REFINE_SELECTION have explicit, deterministic semantics", () => {
    const createPlan = buildTemplateApplyPlan(
      decisionSchema,
      {},
      { TRICH_YEU: "V/v nội dung mới" },
      "CREATE",
    );
    expect(createPlan.values.TRICH_YEU).toBe("V/v nội dung mới");

    const refinePlan = buildTemplateApplyPlan(
      decisionSchema,
      { TRICH_YEU: "V/v bản nháp" },
      { TRICH_YEU: "V/v bản đã tinh chỉnh" },
      "REFINE_SELECTION",
    );
    expect(refinePlan.values.TRICH_YEU).toBe("V/v bản đã tinh chỉnh");
  });
});
