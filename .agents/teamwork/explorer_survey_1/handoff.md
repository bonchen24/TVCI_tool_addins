# Handoff Report — explorer_survey_1

## 1. Observation
- `src/rules/models.ts` lines 1-120: Định nghĩa `DocumentRuleSet`, `ParagraphRules`, `PageRules`, `ParagraphSnapshot`, `PageSetupSnapshot`, `ValidationIssue`, `RuleEvaluationResult`, `DocumentEvaluationSummary`. Định nghĩa mức độ nghiêm trọng `IssueSeverity = "pass" | "warning" | "error"`, trạng thái đánh giá `RuleEvaluationStatus = "PASS" | "FAIL" | "MISSING" | "NOT_APPLICABLE"` và danh mục quy tắc `RuleCategory = "page" | "header" | "symbol_date" | "title" | "recipients" | "body" | "signer"`.
- `src/rules/profiles.ts` lines 24-64: Khai báo 4 bộ cấu hình: `NĐ30_TVCI` (chuẩn NĐ30 mặc định), `TKV`, `IEMM` (Viện Cơ khí), `DANG_05_HD_VPTW_2026` (Văn bản Đảng). Thông số trang NĐ30: A4 Portrait, `topMm: { min: 20, max: 25, target: 20 }`, `bottomMm: { min: 20, max: 25, target: 20 }`, `leftMm: { min: 30, max: 35, target: 30 }`, `rightMm: { min: 15, max: 20, target: 15 }`. Thông số body: Times New Roman 13pt, Justified, spaceBefore 2pt, spaceAfter 2pt, firstLineIndent 10mm, lineSpacingPt 15.6 (multiple 1.2).
- `src/rules/component-rules.ts` lines 16-55: Quy chuẩn chi tiết từng thành phần: `NATIONAL_EMBLEM` (12-13pt, bold, Centered), `MOTTO` (13-14pt, bold, Centered), `AGENCY_NAME` (12-13pt, Centered), `NUMBER_SYMBOL` (13pt, Centered), `PLACE_DATE` (13-14pt, italic, Right), `DOCUMENT_TYPE` (13-14pt, bold, Centered), `ABSTRACT` (13-14pt, bold, Centered), `LEGAL_BASIS` (13pt, italic, Left), `ADDRESSEE` (13-14pt, regular, Left), `RECIPIENTS` (12pt, italic, Left), `SIGNER_ROLE` (13-14pt, bold, Centered). Dòng nơi nhận chi tiết: 11pt, regular, Left.
- `src/rules/horizontal-rules.ts` lines 9-11: Đường kẻ ngang phân tách trích yếu có tỷ lệ `min: 1/3, max: 1/2, target: 0.4` so với dòng dài nhất.
- `src/rules/component-classifier.ts` lines 69-134: Nhận diện 12 loại thành phần văn bản hành chính và Đảng dựa trên regex tiếng Việt chuẩn hóa.
- `src/rules/document-evaluator.ts` lines 28-930: Kiểm tra 25+ quy tắc trên 7 nhóm; tính `healthScore = (passedRules / applicableRules) * 100`.
- `src/commands/safe-issues.ts` lines 6-29: Lọc các issue có `autoFixable: true` và `status === "FAIL"` (bỏ qua `MISSING`); áp dụng sửa qua `applyIssueFix`, `applyPageIssueFix`, `applyTextIssueFix`.
- `src/ai/settings.ts` lines 1-54: Hỗ trợ 2 provider `openai` (model `gpt-4o-mini`) và `gemini` (model `gemini-2.0-flash`).
- `src/ai/administrative-rules.ts` lines 1-11: Hợp đồng prompt `ADMINISTRATIVE_AI_RULES` chống bịa đặt (no-hallucination), không Markdown, không emoji, cấm lặp dữ kiện.
- `src/ai/direct-client.ts` lines 9-51, 194-244, 282-379: Làm sạch text (`sanitizeAiTextOutput`), timeout 45s, retry mạng tự động và xử lý lỗi quota 429.
- `src/ai/proofreading.ts` lines 1-61: Kiểm tra lỗi tiếng Việt trong 5 nhóm `spelling`, `grammar`, `capitalization`, `punctuation`, `administrative_style`.
- `src/ai/apply-plan.ts` lines 8-131: Tạo diff plan (`TemplateApplyPlan`) với 3 chế độ `FILL_MISSING`, `APPEND`, `REPLACE`, loại bỏ dòng trùng (`uniqueLines`), hiển thị trước (Preview-First).
- `src/templates/form-schema.ts` lines 106-181: Định nghĩa 8 schemas form (`Công văn`, `Quyết định`, `Thông báo`, `Tờ trình`, `Báo cáo`, `Biên bản`, `Thư mời`, `Đơn nghỉ phép`).
- `src/templates/catalog.ts` lines 11-345: Danh mục 18+ biểu mẫu chuẩn TVCI/IEMM/Đảng.
- `src/templates/form-validation.ts` lines 55-146: Kiểm tra tính hợp lệ dữ liệu form và định dạng ngày tháng chuẩn hành chính `formatAdministrativeDate`.
- `src/word/form-content-control.service.ts` lines 97-386: Điền dữ liệu 2 tầng: Content Controls có tag và Fallback regex placeholders (`Số: ...`, `ngày ...`, `V/v ...`, `Kính gửi:`, `Nơi nhận:`, `[Họ và tên]`, `[Nội dung...]`).

## 2. Logic Chain
1. Từ `src/rules/profiles.ts` và `src/rules/component-rules.ts`: Toàn bộ các tham số thể thức của Nghị định 30/2020/NĐ-CP được mã hóa thành các hằng số đo lường (`MeasurementRule`: số đơn hoặc khoảng `min-max-target`), căn lề, font chữ, khoảng cách đoạn và giãn dòng.
2. Từ `src/rules/component-classifier.ts` và `src/rules/auto-detect.service.ts`: Bộ máy tự động bóc tách cấu trúc tài liệu bằng cách phân tích văn bản thô theo đoạn, không phụ thuộc vào Office.js khi phân tích logic.
3. Từ `src/rules/document-evaluator.ts` và `src/rules/fixer.ts`: Quy trình audit hoàn toàn tách rời giữa logic tính toán phát hiện sai lệch và logic ghi vào Word. Đầu ra là danh sách các `ValidationIssue` mang thông tin `actual`, `expected`, `fixValue`, cho phép chuyển đổi sang bất kỳ engine soạn thảo nào (như TipTap, Slate hoặc Canvas).
4. Từ `src/ai/`: Quy trình AI gồm 3 phân hệ (Soạn thảo, Soát lỗi, Điền mẫu) đều tuân theo hợp đồng `ADMINISTRATIVE_AI_RULES`, trả về JSON schema có cấu trúc hoặc plain text đã làm sạch, và luôn đi qua `apply-plan.ts` để hiển thị Diff preview trước khi can thiệp vào tài liệu.
5. Từ `src/templates/` và `src/word/form-content-control.service.ts`: Mô hình form 8 loại văn bản hỗ trợ cơ chế điền hai tầng (Content Control + Regex Fallback), giải quyết bài toán biểu mẫu DOCX nhập từ bên ngoài không có metadata XML.

## 3. Caveats
- Các logic phụ thuộc trực tiếp vào `Word.run(...)` và `Office.context` (trong `src/word/`) cần được thay thế bằng Web Editor State API và thư viện `docx` tạo tệp DOCX phía Web.
- Bản mẫu `.docx` đóng gói nằm trong thư mục `/templates` của add-in cần được copy sang Web App để người dùng có thể tải và khởi tạo biểu mẫu mới.

## 4. Conclusion
Toàn bộ logic nghiệp vụ, quy tắc thể thức Nghị định 30, thuật toán kiểm tra lỗi, hệ thống prompt AI chống bịa đặt, thuật toán Diff Preview và schemas biểu mẫu trong `TVCI_word_addins/src` đã được khảo sát, phân tích chi tiết và ghi nhận đầy đủ tại `survey_report.md`. Toàn bộ các module này có thể tái sử dụng trực tiếp dưới dạng TypeScript thuần cho dự án Web Application `TVCI_web_app`.

## 5. Verification Method
- Kiểm tra báo cáo khảo sát chi tiết:
  `e:\CODING\TVCI_word_addins\.agents\teamwork\explorer_survey_1\survey_report.md`
- Chạy test kiểm thử tự động của Word Add-in để xác nhận toàn bộ các rule và service đang hoạt động chính xác:
  ```powershell
  npm test
  ```
- Kiểm tra các file test tương ứng cho từng module:
  - Rules & Fixer: `tests/rules/validator.test.ts`, `tests/rules/document-evaluator.test.ts`, `tests/rules/fixer.test.ts`
  - AI & Diff: `tests/ai/apply-plan.test.ts`, `tests/ai/template-fill.test.ts`, `tests/ai/text-cleanup.test.ts`
  - Form & Templates: `tests/templates/template-forms.test.ts`, `tests/templates/catalog.test.ts`, `tests/content-controls/form-content-control.test.ts`
