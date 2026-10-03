# Khảo sát & Đặc tả Thể thức Văn bản Hành chính TVCI (Nghị định 30/2020/NĐ-CP & Thư viện Biểu mẫu)

Báo cáo khảo sát chuyên sâu của Spec Miner 2 phục vụ kiến trúc và xây dựng Web Application xử lý văn bản TVCI. Khảo sát dựa trên toàn bộ mã nguồn của Word Add-in (`src/`), kho mẫu biểu (`templates/`), tài liệu chấp nhận (`test-documents/`), cùng các văn bản quy phạm pháp luật và quy chế nội bộ (Nghị định 30/2020/NĐ-CP, Quy chế văn thư IEMM, Hướng dẫn 05-HD/VPTW).

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Thể thức trang (Page Setup) | Kiểm tra khổ giấy & định lề | Đo lường kích thước A4 (210x297mm) và lề trang: Trên (20-25mm), Dưới (20-25mm), Trái (30-35mm), Phải (15-20mm), Hướng giấy đứng (Portrait). | `PageSetupSnapshot` (kích thước mm các lề, paperSize, orientation) | Trạng thái `PASS` / `FAIL` / `NOT_APPLICABLE` kèm `ValidationIssue` | Trả về `FAIL` nếu sai lệch > tolerance (0.5mm), báo `NOT_APPLICABLE` nếu kiểm tra theo đoạn chọn hoặc thiếu dữ liệu. | `src/rules/page-validator.ts`, `src/rules/document-evaluator.ts` |
| 2 | Thành phần đầu trang (Header) | Phân loại & kiểm tra Quốc hiệu | Phát hiện dòng "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", kiểm tra font Times New Roman, cỡ 12-13pt, in hoa, đậm, căn giữa. | Mảng chuỗi đoạn văn bản (`paragraphs`) | `ClassifiedComponent`, `RuleEvaluationResult` | Báo `MISSING` nếu văn bản hành chính thiếu Quốc hiệu; báo `FAIL` nếu sai font/size/style; báo `NOT_APPLICABLE` với văn bản Đảng. | `src/rules/component-classifier.ts`, `src/rules/component-rules.ts` |
| 3 | Thành phần đầu trang (Header) | Phân loại & kiểm tra Tiêu ngữ | Phát hiện "Độc lập - Tự do - Hạnh phúc", kiểm tra font Times New Roman, cỡ 13-14pt, đậm, căn giữa, có gạch nối phân cách. | Mảng chuỗi đoạn văn bản | `ClassifiedComponent`, `RuleEvaluationResult` | Báo `MISSING` nếu thiếu; báo `FAIL` nếu sai font/size/style/alignment; `NOT_APPLICABLE` với văn bản Đảng. | `src/rules/component-classifier.ts`, `src/rules/component-rules.ts` |
| 4 | Thành phần đầu trang (Header) | Đường kẻ ngang Tiêu ngữ | Đường kẻ nét liền, mảnh đặt ngay dưới Tiêu ngữ, độ dài bằng chiều dài dòng chữ Tiêu ngữ. | Snapshot đường kẻ hoặc phần tử vẽ | Báo lỗi hoặc tạo OOXML vẽ `<wps:wsp>` | Báo lỗi nếu thiếu đường kẻ hoặc chiều dài không khớp độ dài dòng chữ. | `src/rules/horizontal-rules.ts`, `src/knowledge/seed-data.ts` |
| 5 | Thành phần đầu trang (Header) | Tên cơ quan ban hành (Agency Name) | Cấu trúc 2 cấp: cấp chủ quản (chữ thường/in hoa không đậm) và cấp ban hành (in hoa đậm), cỡ 12-13pt, căn giữa. | Đoạn text đầu văn bản | `ClassifiedComponent`, `RuleEvaluationResult` | Báo `MISSING` nếu thiếu; `FAIL` nếu sai cỡ chữ hoặc không in hoa. | `src/rules/component-classifier.ts`, `src/knowledge/seed-data.ts` |
| 6 | Thành phần đầu trang (Header) | Đường kẻ ngang Tên cơ quan | Đường kẻ nét liền, mảnh đặt dưới tên cơ quan ban hành, độ dài từ 1/3 đến 1/2 độ dài dòng chữ tên cơ quan, căn giữa. | Snapshot hình vẽ / đường kẻ | Báo lỗi hoặc chèn OOXML `<w:sdt>` | Báo lỗi nếu thiếu hoặc chiều rộng vượt ra ngoài tỷ lệ 1/3 - 1/2. | `src/rules/horizontal-rules.ts`, `src/knowledge/seed-data.ts` |
| 7 | Số & Ký hiệu (Symbol & Date) | Kiểm tra Số và ký hiệu văn bản | Bắt đầu bằng "Số: .../...", cỡ 13pt, chữ thường đứng, căn giữa dưới tên cơ quan. Định dạng chuẩn: `Số: [Số]/[Loại]-[Cơ quan]` hoặc `Số: [Số]/[Cơ quan]-[Đơn vị]`. | Đoạn text số hiệu | `ValidationIssue`, `RuleEvaluationResult` | Báo `MISSING` nếu thiếu; `FAIL` nếu công văn có chữ "CV" hoặc thiếu dấu hai chấm. | `src/rules/component-classifier.ts`, `src/utils/tvci-formatter.ts` |
| 8 | Số & Ký hiệu (Symbol & Date) | Địa danh và ngày tháng năm | Dạng "Hà Nội, ngày ... tháng ... năm ...", font Times New Roman, cỡ 13-14pt, chữ nghiêng, căn phải dưới Tiêu ngữ. Ngày <10 và Tháng 1,2 phải có số 0 dẫn đầu. | Chuỗi văn bản ngày tháng | Trạng thái kiểm tra & chuẩn hóa chuỗi | Báo `MISSING` nếu thiếu; tự động sửa định dạng (ví dụ tháng 9 không đệm 0, ngày 03 đệm 0). | `src/utils/tvci-formatter.ts`, `src/templates/form-validation.ts` |
| 9 | Tiêu đề & Trích yếu (Title & Abstract) | Tên loại văn bản có tên loại | Nhận diện: QUYẾT ĐỊNH, THÔNG BÁO, TỜ TRÌNH, BÁO CÁO, BIÊN BẢN, KẾ HOẠCH... Font Times New Roman, cỡ 13-14pt (hoặc 14pt), in hoa, đậm, căn giữa. | Mảng đoạn văn | `ClassifiedComponent` type `DOCUMENT_TYPE` | Báo `MISSING` nếu văn bản có tên loại nhưng thiếu dòng tiêu đề in hoa; `FAIL` nếu sai font/size. | `src/rules/component-classifier.ts`, `src/rules/component-rules.ts` |
| 10 | Tiêu đề & Trích yếu (Title & Abstract) | Trích yếu nội dung văn bản | Nằm ngay dưới tên loại (cỡ 13-14pt đậm căn giữa) hoặc dưới số hiệu công văn (cỡ 12-13pt đứng không đậm). Dưới trích yếu có đường kẻ dài 1/3 - 1/2 dòng chữ. | Chuỗi text trích yếu | Trạng thái đánh giá & đường kẻ phân cách | Báo lỗi nếu thiếu trích yếu hoặc trích yếu có dấu `:` sau V/v hoặc lặp tiền tố `V/v: V/v...`. | `src/rules/horizontal-rules.ts`, `src/utils/tvci-formatter.ts` |
| 11 | Địa chỉ nhận (Addressee) | Khối Kính gửi (1 nơi vs nhiều nơi) | 1 nơi nhận: cùng dòng "Kính gửi: [Đơn vị]" không dấu kết. Nhiều nơi nhận: dòng "Kính gửi:", mỗi nơi gạch đầu dòng "-", kết thúc dòng trung gian bằng ";", dòng cuối kết thúc bằng ".". | Mảng đoạn text Kính gửi | Danh sách `ValidationIssue` và giá trị sửa | Tự động thêm dấu hai chấm, chuẩn hóa dấu gạch đầu dòng, dấu `;` và `.` cuối khối. | `src/rules/addressee-validator.ts`, `src/utils/tvci-formatter.ts` |
| 12 | Căn cứ ban hành (Legal Basis) | Khối Căn cứ pháp lý | Mỗi căn cứ một đoạn, bắt đầu bằng "Căn cứ...", in nghiêng, cỡ 13pt. Các dòng trước kết thúc bằng dấu chấm phẩy ";", dòng cuối cùng kết thúc bằng dấu chấm "." (hoặc dấu phẩy "," với văn bản Đảng). | Mảng đoạn Căn cứ | `ValidationIssue` phát hiện sai dấu câu | Báo lỗi nếu căn cứ không kết thúc bằng `;` hoặc căn cứ cuối không kết thúc bằng `.` / `,`. | `src/rules/legal-basis-validator.ts` |
| 13 | Định dạng nội dung (Body Format) | Kiểm tra font, cỡ chữ, căn lề đoạn văn | Phông chữ Times New Roman; cỡ chữ 13-14pt; căn lề Justified (căn đều hai bên); thụt đầu dòng 10mm - 12.7mm (0.5 inch); khoảng cách đoạn: spaceBefore 0-6pt, spaceAfter 0-6pt; giãn dòng 1.2 - 1.5 lines (15.6pt). | Danh sách `ParagraphSnapshot` nội dung | Danh sách lỗi thể thức từng đoạn | Phát hiện sai font (ví dụ Arial), sai cỡ chữ, sai căn lề (Left/Right/Center), sai thụt đầu dòng hoặc giãn dòng. Hỗ trợ tự động sửa (autoFixable). | `src/rules/document-evaluator.ts`, `src/rules/fixer.ts` |
| 14 | Danh sách & Gạch đầu dòng | Chuẩn hóa danh sách trong nội dung | Các ý bắt đầu bằng gạch đầu dòng "-", chữ cái đầu viết hoa, các ý trung gian kết thúc bằng ";", ý cuối kết thúc bằng ".". | Mảng chuỗi các dòng mục | Mảng chuỗi chuẩn hóa | Tự động viết hoa chữ cái đầu và chuẩn hóa dấu chấm phẩy/chấm cuối dòng. | `src/utils/tvci-formatter.ts`, `src/drafting/presets.ts` |
| 15 | Khối ký tên (Signer Block) | Quyền hạn, chức vụ & Họ tên người ký | Quyền hạn/Chức vụ: in hoa, đậm, cỡ 13-14pt, căn giữa. Khoảng trống ký tên: 35-50mm. Họ và tên người ký: cỡ 13-14pt, in đậm, căn giữa. | Đoạn text chức vụ và họ tên | `ClassifiedComponent`, `RuleEvaluationResult` | Báo `MISSING` nếu thiếu chức vụ hoặc thiếu họ tên sau chức vụ; báo `FAIL` nếu họ tên không in đậm. | `src/rules/component-classifier.ts`, `src/rules/document-evaluator.ts` |
| 16 | Nơi nhận (Recipients Block) | Khối Nơi nhận chân trang | Tiêu đề "Nơi nhận:": cỡ 12pt, in đậm, nghiêng. Danh sách nơi nhận: cỡ 11pt, chữ thường đứng, bắt đầu bằng "-", kết thúc bằng ";". Dòng lưu trữ: "Lưu: VT, [đơn vị]." cỡ 11pt đứng kết thúc bằng "." (không ghi số bản lưu). | Mảng đoạn Nơi nhận | Danh sách lỗi và giá trị sửa chuẩn hóa | Báo lỗi nếu thiếu dấu hai chấm, thiếu gạch đầu dòng, ghi số lượng bản lưu (ví dụ "02 bản") hoặc sai dấu câu. | `src/rules/recipients-validator.ts`, `src/drafting/presets.ts` |
| 17 | Đánh số trang (Page Numbering) | Đánh số trang văn bản | Đánh số từ trang 2, chữ số Ả Rập, cỡ 13-14pt, đứng. Vị trí NĐ30: header-center (canh giữa lề trên). Vị trí IEMM/TKV: footer-right (canh phải lề dưới). Đảng: footer-center. Ẩn số trang thứ nhất. | Cấu hình profile | Đoạn mã OOXML `<w:sdt>` chứa trường `PAGE` | Kiểm tra vị trí hiển thị và loại trừ trang 1. | `src/drafting/presets.ts` |
| 18 | Thư viện biểu mẫu (Template Catalog) | Quản lý danh mục 22 biểu mẫu | Cung cấp danh mục biểu mẫu phân loại theo cơ quan (TVCI, IEMM, DANG, TKV), loại văn bản, từ khóa, đường dẫn file DOCX và hướng dẫn áp dụng. | ID mẫu, cơ quan, từ khóa tìm kiếm | Mảng `TemplateRecord[]` đã lọc và sắp xếp | Lọc bỏ biểu mẫu lưu trữ (archived), hỗ trợ tìm kiếm mờ tiếng Việt không dấu (fuzzy matching). | `src/templates/catalog.ts`, `src/templates/library.ts` |
| 19 | Lược đồ nhập liệu (Form Schema Registry) | Định nghĩa trường form động cho 8 nhóm văn bản | Cung cấp schema trường cho: Công văn, Quyết định, Thông báo, Tờ trình, Báo cáo, Biên bản, Thư mời, Đơn nghỉ phép. Xác định loại trường (text, textarea, date, select, repeatable, multi-line). | Tên loại văn bản / ID mẫu | `TemplateFormSchema` gồm danh sách `TemplateFormField[]` | Kiểm tra trùng lặp tag, định dạng tag chuẩn hoa `^[A-Z][A-Z0-9_]*$`. | `src/templates/form-schema.ts` |
| 20 | Kiểm tra & Chuẩn hóa Form (Form Validation) | Kiểm tra dữ liệu form trước khi chèn | Kiểm tra bắt buộc (required), định dạng ngày tháng hợp lệ, ngày kết thúc >= ngày bắt đầu (đơn nghỉ phép), tùy chọn select hợp lệ, chuẩn hóa tiền tố V/v. | Giá trị form (`TemplateFormValues`) | Danh sách lỗi `TemplateFormValidationError[]` | Chặn lưu hoặc chèn nếu dữ liệu bắt buộc bị trống hoặc định dạng ngày sai. | `src/templates/form-validation.ts` |
| 21 | Đồng bộ Word Content Control | Điền trường form vào Content Control DOCX | Ghép nối các trường form với Content Control trong DOCX có tag tương ứng (`SO_KY_HIEU`, `NGAY_BAN_HANH`, `TRICH_YEU`, `KINH_GUI`, `NOI_DUNG`, `NGUOI_KY`, `NOI_NHAN`...). | Schema, Controls trong tài liệu, Values | `TemplateFormContentControlResult` (updates, missingFields) | Bỏ qua các tag layout kỹ thuật (`TVCI_HRULE:`), báo cáo danh sách trường còn thiếu. | `src/word/form-content-control.service.ts` |
| 22 | Thay thế Placeholder dự phòng (Fallback Placeholders) | Điền form khi DOCX thiếu Content Control | Tự động dò tìm các đoạn văn bản trong DOCX khớp mẫu ký tự đại diện (`Số: .../...`, `ngày ... tháng ...`, `V/v: ...`, `[Họ và tên]`, `Kính gửi: [...]`) để thay thế và bọc thẻ Content Control. | Paragraphs trong DOCX, Values form | Cập nhật nội dung văn bản và bọc thẻ Content Control mới | Bỏ qua các chỉ dẫn mẫu chưa dùng (`[Nội dung do ... soạn thảo]`). | `src/word/form-content-control.service.ts` |
| 23 | Tự động nhận diện ngữ cảnh (Auto-Detect) | Suy luận cơ quan và loại văn bản | Quét 20 đoạn đầu của tài liệu để nhận biết đơn vị (TVCI, IEMM, DANG, TKV) và loại văn bản dựa trên từ khóa, ký hiệu văn bản, tiêu đề. | Mảng chuỗi đoạn văn | `AutoDetectResult` (đơn vị, profileId, documentType, confidence, rationale) | Trả về mặc định TVCI / NĐ30 nếu tài liệu trống hoặc không phát hiện dấu hiệu đặc thù. | `src/rules/auto-detect.service.ts` |
| 24 | Phân rã văn bản nháp (AI / Rule Decomposer) | Tách văn bản thô vào các trường form | Phân tích văn bản thô chưa cấu trúc để bóc tách: Số ký hiệu, Ngày tháng, Trích yếu, Kính gửi, Căn cứ, Nội dung, Điều khoản, Người ký, Nơi nhận... | Chuỗi văn bản thô (`rawText`) | `TemplateFormValues` điền sẵn vào các trường form | Tự động làm sạch heading/nhãn trùng lặp, không đưa nhãn cấu trúc vào nội dung trường. | `src/ai/template-matcher.ts`, `src/ai/template-form.ts` |
| 25 | Xem trước tài liệu A4 (A4 Preview) | Hiển thị bản in mô phỏng trang A4 | Vẽ bố cục chuẩn trang A4 (595x842px tại 72dpi, lề, bảng header 2 cột, bảng footer 2 cột, đường kẻ, font Times New Roman) kèm điều khiển zoom. | Template, Schema, Form Values | React component trực quan thời gian thực | Phản ánh chính xác kết quả xuất Word mà không cần mở Microsoft Word. | `src/taskpane/components/A4DocumentPreview.tsx` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Kiểm tra tài liệu trống | Mảng paragraphs rỗng `[]` hoặc chỉ chứa ký tự khoảng trắng `["  \n\t  "]` | Bộ máy chấm điểm nhận diện `isBlankDocument = true`, đặt `healthScore = 0`, không cho phép mẫu số/tử số sinh ra điểm ảo (như 27/27 hay 100%). |
| 2 | Đo lường lề trang khi không hỗ trợ | Môi trường Word API không đọc được `PageSetup` hoặc kiểm tra trong phạm vi vùng chọn (selection scope) | Đánh dấu toàn bộ 6 quy tắc lề trang là `NOT_APPLICABLE`, loại bỏ chúng khỏi mẫu số tính điểm `healthScore` để điểm số không bị kéo tụt sai lệch. |
| 3 | Trích yếu có dấu hai chấm và lặp từ | Dữ liệu người dùng nhập: `"V/v: v/v nghiệm thu thiết bị"` hoặc `"Về việc: V/v triển khai công việc"` | Bộ chuẩn hóa tự động làm sạch thành `"V/v nghiệm thu thiết bị"` hoặc `"Về việc triển khai công việc"`, loại bỏ hoàn toàn dấu hai chấm và chữ cái đầu sau V/v được chuyển thành chữ thường. |
| 4 | Trình bày Kính gửi 1 nơi | Người dùng nhập 1 cơ quan: `"Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam."` kèm dấu chấm cuối | Bộ chuẩn hóa tạo chuỗi `"Kính gửi: Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam"`, nằm trên 1 dòng, loại bỏ dấu chấm/chấm phẩy ở cuối dòng. |
| 5 | Trình bày Kính gửi từ 2 nơi trở lên | Người dùng nhập: `["Bộ Công Thương", "Viện Cơ khí", "Tập đoàn Vinacomin"]` | Tự động xuống dòng sau "Kính gửi:", mỗi nơi nhận thêm dấu gạch đầu dòng `- `, các dòng giữa kết thúc bằng `;`, dòng cuối cùng kết thúc bằng `.`. |
| 6 | Định dạng ngày tháng năm đặc thù | Ngày tháng nhập dạng ISO `"2026-01-05"` hoặc `"2026-09-08"` | Ngày <10 tự động đệm 0 (`ngày 05`, `ngày 08`). Tháng 1 đệm 0 (`tháng 01`), nhưng tháng 9 KHÔNG đệm 0 (`tháng 9`). Kết quả: `"Hà Nội, ngày 05 tháng 01 năm 2026"` và `"Hà Nội, ngày 08 tháng 9 năm 2026"`. |
| 7 | Nơi nhận chứa số bản lưu cũ | Đoạn Nơi nhận nhập theo thói quen cũ: `"- Lưu: VT, VP, 05 bản."` | Bộ chuẩn hóa phát hiện sai thể thức NĐ30 (NĐ30 đã bỏ quy định ghi số bản lưu), tự động sửa thành `"- Lưu: VT, VP."`. |
| 8 | Căn cứ pháp lý cuối cùng trong Quyết định | 3 dòng căn cứ pháp lý: Căn cứ Luật..., Căn cứ Nghị định..., Căn cứ Quyết định... | 2 dòng đầu bắt buộc kết thúc bằng `;`. Dòng cuối cùng kết thúc bằng `.` đối với văn bản hành chính NĐ30, hoặc kết thúc bằng `,` đối với văn bản Đảng theo Hướng dẫn 05-HD/VPTW. |
| 9 | Điền biểu mẫu với file DOCX thiếu Content Control | Mẫu DOCX tải lên chỉ có văn bản thô với các ký hiệu chấm lửng `Số: .../VCNM-TTTN` và `[Họ và tên]` | Hàm `applyFallbackPlaceholders` quét tìm các vị trí đại diện qua Regex, thay thế bằng dữ liệu form và tự động bọc vùng văn bản đó bằng thẻ Word Content Control mới. |
| 10 | Đoạn chỉ dẫn soạn thảo còn thừa trong template | Trong DOCX có đoạn `"[Nội dung do Trung tâm chủ trì soạn thảo.]"` nhưng người dùng đã nhập nội dung thật | Hàm `clearUnusedTemplateBodyInstructions` tự động xóa các đoạn chỉ dẫn giữ chỗ thừa này để văn bản hoàn chỉnh không bị dính chữ placeholder kỹ thuật. |
| 11 | Độ dài đường kẻ trích yếu không đạt tỷ lệ | Đường kẻ dưới trích yếu có chiều dài 20pt trên dòng chữ dài 200pt (tỷ lệ 10%) | Bộ validator phát hiện vi phạm quy tắc `TITLE_ABSTRACT` (yêu cầu 33% - 50% chiều dài dòng chữ), sinh issue và cung cấp giá trị fix mục tiêu 40% (80pt). |
| 12 | Văn bản Đảng không có Quốc hiệu / Tiêu ngữ | Văn bản có profile `DANG_05_HD_VPTW_2026` | Quy tắc Quốc hiệu và Tiêu ngữ tự động chuyển sang `NOT_APPLICABLE`; thay vào đó kích hoạt quy tắc bắt buộc kiểm tra Tiêu đề `"ĐẢNG CỘNG SẢN VIỆT NAM"` (font Times New Roman, cỡ 13pt, in hoa, đậm, căn giữa). |

---

## Chi tiết Đặc tả Thể thức Nghị định 30/2020/NĐ-CP & Quy cách TVCI / IEMM

### 1. Bố cục Trang in & Phông chữ (Điều 4 & 5, Phụ lục I)
- **Khổ giấy**: A4 (210 mm x 297 mm), sai số cho phép ± 0.5 mm. Hướng giấy mặc định: Dọc (Portrait). Với tài liệu có bảng biểu thống kê lớn: Cho phép quay ngang (Landscape).
- **Định lề trang (Margins)**:
  - Lề trên (Top): Cách mép trên từ **20 mm - 25 mm** (Target mặc định của hệ thống: `20 mm` hoặc `57 pt`).
  - Lề dưới (Bottom): Cách mép dưới từ **20 mm - 25 mm** (Target mặc định: `20 mm`).
  - Lề trái (Left): Cách mép trái từ **30 mm - 35 mm** (Target mặc định: `30 mm` hoặc `85 pt`, đảm bảo khoảng cách đóng gáy hồ sơ).
  - Lề phải (Right): Cách mép phải từ **15 mm - 20 mm** (Target mặc định: `15 mm` hoặc `43 pt`).
- **Phông chữ (Font)**: Bắt buộc sử dụng phông chữ **Times New Roman**, bộ mã ký tự Unicode theo Tiêu chuẩn Việt Nam TCVN 6909:2001, màu đen chuẩn (`#000000`). Tuyệt đối không pha trộn phông chữ (như Arial, Calibri, Tahoma).

### 2. Bảng Đầu trang (2-Column Header Table)
Phần đầu của văn bản hành chính được trình bày trên một bảng 2 cột, 1 hàng không viền (borderless table):
- **Cột 1 (Bên trái) - Tên cơ quan ban hành & Số hiệu văn bản**:
  - Chiều rộng cột: Chiếm từ **40% đến 45%** độ rộng trang (khoảng 65 - 75 mm).
  - Cấp 1 (Cơ quan chủ quản cấp trên trực tiếp): Chữ in hoa, cỡ **12 - 13 pt**, kiểu chữ đứng, không đậm. Ví dụ: `TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM` (văn bản cấp Viện) hoặc `VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN` (văn bản cấp Trung tâm TVCI).
  - Cấp 2 (Cơ quan, đơn vị ban hành văn bản): Chữ in hoa, cỡ **12 - 13 pt**, kiểu chữ đứng, **in đậm**. Ví dụ: `VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN` hoặc `TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP`.
  - Đường kẻ ngang dưới tên cơ quan: Nét liền, mảnh, có độ dài từ **1/3 đến 1/2** độ dài của dòng chữ tên cơ quan, đặt canh giữa.
  - Số và ký hiệu văn bản: Đặt canh giữa dưới tên cơ quan, cỡ **13 pt**, kiểu chữ đứng.
    - Với Công văn: `Số: .../VCNM-TTTN` (Tuyệt đối không có chữ CV).
    - Với Quyết định: `Số: .../QĐ-VCNM`.
    - Với Thông báo: `Số: .../TB-VCNM`.
    - Với Tờ trình: `Số: .../TTr-VCNM`.
  - Riêng với Công văn: Trích yếu nội dung (V/v...) được bố cục đặt ngay dưới số và ký hiệu ở cột trái này, cỡ chữ **12 - 13 pt**, chữ in thường, kiểu đứng hoặc nghiêng nhẹ, không in đậm.
- **Cột 2 (Bên phải) - Quốc hiệu, Tiêu ngữ & Địa danh, Ngày tháng**:
  - Chiều rộng cột: Chiếm từ **55% đến 60%** độ rộng trang (khoảng 90 - 105 mm).
  - Quốc hiệu: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM` - Dòng trên cùng, chữ in hoa, cỡ **12 - 13 pt**, kiểu chữ đứng, **in đậm**, căn giữa cột phải.
  - Tiêu ngữ: `Độc lập - Tự do - Hạnh phúc` - Nằm dưới Quốc hiệu, chữ in thường (chữ cái đầu của các từ viết hoa), cỡ **13 - 14 pt**, kiểu chữ đứng, **in đậm**, căn giữa cột phải. Các từ phân cách bằng gạch nối `-` có dấu cách 2 bên.
  - Đường kẻ ngang dưới Tiêu ngữ: Nét liền, mảnh, có độ dài **bằng độ dài của dòng chữ Tiêu ngữ**, đặt canh giữa.
  - Địa danh và ngày, tháng, năm: Đặt dưới Tiêu ngữ, cỡ **13 - 14 pt**, kiểu chữ **in nghiêng**, căn giữa hoặc căn lề phải của cột.
    - Quy tắc viết số ngày, tháng:
      - Ngày dưới 10: Phải có chữ số 0 phía trước (ví dụ: `ngày 01`, `ngày 09`).
      - Tháng 1, tháng 2: Phải có chữ số 0 phía trước (ví dụ: `tháng 01`, `tháng 02`).
      - Tháng 3 đến tháng 12: Viết bình thường, KHÔNG có chữ số 0 phía trước (ví dụ: `tháng 3`, `tháng 9`, `tháng 12`).
      - Năm: Viết đủ 4 chữ số (ví dụ: `năm 2026`).

### 3. Tên loại Văn bản & Trích yếu Nội dung (Điều 10 & 11)
- Áp dụng cho các văn bản có tên loại (Quyết định, Thông báo, Tờ trình, Báo cáo, Kế hoạch...):
  - **Tên loại văn bản**: In hoa, font Times New Roman, cỡ **14 pt**, kiểu đứng, **in đậm**, căn giữa trang giấy.
  - **Trích yếu nội dung**: Đặt ngay dưới tên loại văn bản, cỡ **13 - 14 pt**, kiểu chữ đứng, **in đậm**, căn giữa trang giấy.
  - **Đường kẻ ngang phân cách trích yếu**: Nét liền, mảnh, có độ dài từ **1/3 đến 1/2** độ dài dòng chữ dài nhất của trích yếu, đặt canh giữa.
- Đối với Công văn:
  - Không có từ "CÔNG VĂN".
  - Trích yếu đặt ở cột trái dưới Số hiệu: Cỡ **12 - 13 pt**, kiểu đứng, chữ thường, không đậm. Bắt đầu bằng `V/v` hoặc `Về việc`, TUYỆT ĐỐI không có dấu hai chấm sau tiền tố, chữ cái đầu tiên của nội dung trích yếu viết thường.

### 4. Định dạng Nội dung Văn bản (Điều 12 & 13)
- **Kiểu chữ & Cỡ chữ**: Chữ in thường, font Times New Roman, cỡ **13 - 14 pt**, kiểu đứng.
- **Căn lề**: Căn đều hai bên (`Justified`).
- **Thụt lề đầu dòng (First line indent)**: Từ **10 mm đến 12.7 mm** (chuẩn 1.27 cm / 0.5 inch).
- **Giãn dòng (Line Spacing)**: Tối thiểu là giãn dòng đơn (`single`), tối đa là `1.5 lines`. Chuẩn tối ưu trong TVCI Add-in là **1.2 lines** (tương đương `15.6 pt` cho chữ 13pt).
- **Khoảng cách đoạn (Paragraph Spacing)**: Khoảng cách trước (`spaceBefore`) từ **0 - 6 pt** (chuẩn TVCI: 2 pt); khoảng cách sau (`spaceAfter`) từ **0 - 6 pt** (chuẩn TVCI: 2 pt).
- **Cấu trúc phân cấp đề mục trong nội dung**:
  - `Phần I`: Cỡ 13pt, in hoa, đậm, căn giữa, tiêu đề dòng riêng in hoa đậm.
  - `Chương I`: Cỡ 13pt, in hoa, đậm, căn giữa, tiêu đề dòng riêng in hoa đậm.
  - `Mục 1`: Cỡ 13pt, đậm, căn giữa.
  - `Điều 1.`: Cỡ 13pt, đậm, lùi đầu dòng 10mm - 12.7mm, tên điều viết hoa chữ cái đầu.
  - `1. Khoản`: Cỡ 13pt, chữ thường, đứng.
  - `a) Điểm`: Cỡ 13pt, chữ thường, đứng.
  - `- Ý / Gạch đầu dòng`: Cỡ 13pt, chữ cái đầu viết hoa, kết thúc bằng `;`, ý cuối kết thúc bằng `.`.

### 5. Khối Kính gửi (Addressee)
- Cỡ chữ **13 - 14 pt**, kiểu đứng, bắt đầu bằng `Kính gửi:`.
- **Trường hợp 1 nơi nhận**:
  - Nằm trên cùng 1 dòng với chữ Kính gửi: `Kính gửi: Tên đơn vị / cá nhân`
  - Căn lề trái hoặc thụt lề, không có dấu chấm/phẩy ở cuối dòng.
- **Trường hợp từ 2 nơi nhận trở lên**:
  - Dòng 1: `Kính gửi:` (đứng độc lập).
  - Các dòng sau: Mỗi cơ quan một dòng có gạch đầu dòng `- `, thẳng hàng nhau.
  - Dấu kết thúc: Các dòng trung gian kết thúc bằng dấu chấm phẩy `;`, dòng cuối cùng kết thúc bằng dấu chấm `.`.

### 6. Bảng Chân trang & Khối Chữ ký (2-Column Footer Table)
Phần cuối văn bản được bố cục bằng một bảng 2 cột, 1 hàng không viền (borderless table):
- **Cột 1 (Bên trái) - Khối Nơi nhận**:
  - Chiều rộng cột: Chiếm từ **45% đến 50%** độ rộng trang.
  - Dòng tiêu đề `Nơi nhận:`: Cỡ chữ **12 pt**, kiểu chữ **nghiêng, in đậm**, căn lề trái.
  - Các dòng liệt kê nơi nhận: Cỡ chữ **11 pt**, kiểu chữ thường, đứng, căn lề trái. Mỗi đơn vị nhận một dòng, bắt đầu bằng dấu gạch đầu dòng `- `, kết thúc bằng dấu chấm phẩy `;`.
  - Dòng lưu văn thư: Nằm ở dòng cuối cùng, dạng `Lưu: VT, [đơn vị soạn thảo].` (ví dụ: `Lưu: VT, T2.` hoặc `Lưu: VT, Văn phòng.`), cỡ **11 pt**, kiểu đứng, kết thúc bằng dấu chấm `.`. Theo NĐ 30/2020, **tuyệt đối không ghi số lượng bản lưu**.
- **Cột 2 (Bên phải) - Khối Quyền hạn, Chức vụ & Họ tên người ký**:
  - Chiều rộng cột: Chiếm từ **50% đến 55%** độ rộng trang. Toàn bộ nội dung căn giữa cột phải.
  - Dòng quyền hạn (nếu ký thay, ký thừa lệnh, ký thừa ủy quyền): Viết hoa chữ tắt `TM.`, `KT.`, `TL.`, `TUQ.`, cỡ **13 - 14 pt**, in hoa, đứng, **in đậm**. Ví dụ: `TM. ĐOÀN CHỦ TỊCH`, `KT. VIỆN TRƯỞNG / PHÓ VIỆN TRƯỞNG`.
  - Dòng chức vụ người ký: Cỡ **13 - 14 pt**, in hoa, đứng, **in đậm**. Ví dụ: `GIÁM ĐỐC`, `VIỆN TRƯỞNG`.
  - Khoảng trống ký tên & đóng dấu: Chiều cao tối thiểu từ **35 mm đến 50 mm** (khoảng cách 3 đến 4 dòng trắng, khoảng 60px trên web).
  - Họ và tên người ký: Đặt dưới cùng, cỡ **13 - 14 pt**, kiểu chữ đứng, **in đậm**.

---

## Danh mục Biểu mẫu Chuẩn TVCI / IEMM & Cấu trúc Chi tiết

Hệ thống Add-in hiện quản lý 22 biểu mẫu chuẩn trong `TEMPLATE_CATALOG` (`src/templates/catalog.ts` và thư mục `templates/iemm/`), trong đó 8 nhóm loại văn bản cốt lõi có schema nhập liệu form hoàn chỉnh:

```
templates/
├── dang-sample.docx                     (Mẫu văn bản Đảng theo 05-HD/VPTW)
├── sample-template.docx                 (Mẫu Content Control fixture: TEN_KHACH_HANG, SO_HO_SO)
├── tvci-cong-van-template.docx          (Công văn TVCI / VCNM-TTTN)
├── tvci-thong-bao-template.docx         (Thông báo TVCI / TB-VCNM)
├── tvci-sample.docx                     (Biểu mẫu khởi tạo TVCI)
├── iemm-bien-ban-template.docx          (Biên bản Viện)
├── iemm-cong-van-template.docx          (Công văn hành chính Viện)
├── iemm-don-xin-nghi-phep-template.docx (Đơn xin nghỉ phép Viện)
├── iemm-quyet-dinh-template.docx        (Quyết định cá biệt Viện)
├── iemm-thong-bao-template.docx         (Thông báo nội bộ Viện)
├── iemm-thu-moi-template.docx           (Thư mời họp Viện)
├── iemm-to-trinh-template.docx          (Tờ trình Viện gửi cấp trên)
├── iemm-to-trinh-noi-bo-template.docx   (Tờ trình nội bộ phòng ban gửi Viện)
├── iemm-van-ban-co-ten-loai-template.docx (Văn bản có tên loại dùng chung)
└── iemm/ (Bộ 14 mẫu quy chuẩn theo QĐ 731-2023 Phụ lục VII):
    ├── 01-quyet-dinh-ca-biet.docx
    ├── 02-quyet-dinh-ban-hanh-van-ban.docx
    ├── 03-quy-che-quy-dinh.docx
    ├── 04-van-ban-ban-hanh-kem-theo-quyet-dinh.docx
    ├── 05-cong-van-hanh-chinh.docx
    ├── 06-thong-bao-noi-bo-vien.docx
    ├── 07-to-trinh-cua-vien.docx
    ├── 08-to-trinh-cua-don-vi-gui-vien.docx
    ├── 09-bien-ban.docx
    ├── 10-van-ban-chung.docx
    ├── 11-ban-sao-van-ban.docx
    ├── 12-thu-moi-hop.docx
    ├── 13-thu-bao-hoan-hop.docx
    └── 14-cong-van-dinh-chinh.docx
```

### 1. Công văn (Official Dispatch)
- **Tập tin mẫu**: `templates/tvci-cong-van-template.docx`, `templates/iemm/05-cong-van-hanh-chinh.docx`.
- **Ký hiệu gợi ý**: `Số: …/VCNM-TTTN` (với Trung tâm) hoặc `Số: …/VCNM-[ĐƠN VỊ]` (với Viện). Tuyệt đối không có chữ CV.
- **Bố cục đặc thù**:
  - Không có tiêu đề lớn "CÔNG VĂN".
  - Trích yếu `V/v ...` đặt ngay dưới Số hiệu tại cột trái của Header, cỡ 12-13pt, chữ thường, không đậm.
  - Khối Kính gửi: Cỡ 13pt đứng, đặt phía trên phần nội dung.
  - Khối Nội dung: Bắt đầu bằng lời mở đầu, căn cứ, nội dung triển khai, kết thúc bằng `Trân trọng./.` hoặc `Trân trọng cảm ơn./.`.
  - Khối Nơi nhận & Ký tên: Bảng 2 cột chuẩn.
- **Các trường động (Schema Fields)**:
  - `SO_KY_HIEU` (text, required): Số và ký hiệu công văn (ví dụ: `12/VCNM-TTTN`).
  - `NGAY_BAN_HANH` (date, required): Ngày ban hành (chuẩn hóa dạng: `Hà Nội, ngày 09 tháng 9 năm 2026`).
  - `NOI_NHAN_TRUC_TIEP` (multi-line, required): Khối Kính gửi trực tiếp.
  - `TRICH_YEU` (text, required): Trích yếu công văn (ví dụ: `V/v triển khai công tác kiểm định an toàn`).
  - `NOI_DUNG` (textarea, required): Nội dung chi tiết của công văn.
  - `NGUOI_KY` (text, required): Họ và tên người ký.
  - `NOI_NHAN` (multi-line, required): Danh sách các nơi nhận gửi kèm và dòng Lưu.

### 2. Quyết định (Decision)
- **Tập tin mẫu**: `templates/iemm/01-quyet-dinh-ca-biet.docx`, `templates/iemm/02-quyet-dinh-ban-hanh-van-ban.docx`.
- **Ký hiệu gợi ý**: `Số: …/QĐ-VCNM`.
- **Bố cục đặc thù**:
  - Tiêu đề giữa: `QUYẾT ĐỊNH` (14pt in hoa đậm).
  - Dòng dưới: `Về việc [nội dung quyết định]` (13pt đậm, có đường kẻ 1/3-1/2 bên dưới).
  - Chức danh ban hành: `VIỆN TRƯỞNG VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN` (13pt in hoa đậm).
  - Căn cứ pháp lý: `Căn cứ ...;`, in nghiêng, cỡ 12.5-13pt, thụt lề 1.27cm, dòng căn cứ cuối kết thúc bằng dấu phẩy `,` hoặc chấm `.`.
  - Lệnh ban hành: `QUYẾT ĐỊNH:` (13.5pt in hoa đậm, căn giữa).
  - Các điều khoản: `Điều 1.`, `Điều 2.`, `Điều 3.` (in đậm tên Điều, nội dung thụt lề 1.27cm).
- **Các trường động (Schema Fields)**:
  - `SO_KY_HIEU` (text, required): Số và ký hiệu quyết định (ví dụ: `123/QĐ-VCNM`).
  - `NGAY_BAN_HANH` (date, required): Ngày ký ban hành.
  - `TRICH_YEU` (text, required): Trích yếu quyết định (ví dụ: `Về việc kiện toàn nhân sự phòng Thử nghiệm`).
  - `CAN_CU` (repeatable, required): Danh sách các văn bản pháp lý làm căn cứ.
  - `DIEU_KHOAN` (repeatable, required): Nội dung các Điều khoản thực hiện.
  - `NGUOI_KY` (text, required): Họ và tên người ký quyết định (Viện trưởng/Giám đốc).
  - `NOI_NHAN` (multi-line, required): Nơi nhận quyết định (Như Điều ..., các phòng liên quan, Lưu VT).

### 3. Thông báo (Notice / Announcement)
- **Tập tin mẫu**: `templates/tvci-thong-bao-template.docx`, `templates/iemm/06-thong-bao-noi-bo-vien.docx`.
- **Ký hiệu gợi ý**: `Số: …/TB-VCNM` (Quy định: Số thông báo không kèm tên đơn vị soạn thảo).
- **Bố cục đặc thù**:
  - Tiêu đề giữa: `THÔNG BÁO` (14pt in hoa đậm).
  - Dòng trích yếu: `Về việc [nội dung thông báo]` (13pt đậm, có đường kẻ mảnh bên dưới).
  - Khối `Kính gửi:` (hoặc đối tượng nhận thông báo): Các phòng, ban, đơn vị trực thuộc.
  - Khối nội dung thông báo: Trình bày các điểm thông báo bằng số hoặc gạch đầu dòng.
  - Nơi nhận: Thường gồm: `Như trên;`, `Lưu: VT, [đơn vị].`.
- **Các trường động (Schema Fields)**:
  - `SO_KY_HIEU` (text, required): Số thông báo (ví dụ: `45/TB-VCNM`).
  - `NGAY_BAN_HANH` (date, required): Ngày ra thông báo.
  - `DOI_TUONG_NHAN` (multi-line, required): Khối Kính gửi đối tượng nhận thông báo.
  - `NOI_DUNG` (textarea, required): Nội dung chi tiết các điểm thông báo.
  - `NGUOI_KY` (text, required): Họ và tên người ký thông báo.
  - `NOI_NHAN` (multi-line, required): Nơi nhận thông báo.

### 4. Tờ trình (Proposal / Submission)
- **Tập tin mẫu**: `templates/iemm/07-to-trinh-cua-vien.docx` (Gửi cấp trên), `templates/iemm/08-to-trinh-cua-don-vi-gui-vien.docx` (Nội bộ đơn vị gửi Viện).
- **Ký hiệu gợi ý**: `Số: …/TTr-VCNM` (Mẫu gửi cấp trên). Riêng mẫu Tờ trình nội bộ **không lấy số văn bản, không đóng dấu Viện và không lưu tại Văn thư Viện**.
- **Bố cục đặc thù**:
  - Tiêu đề: `TỜ TRÌNH` (14pt in hoa đậm).
  - Trích yếu: `Về việc [nội dung trình]` (13pt đậm căn giữa).
  - Khối `Kính gửi:`: Cấp có thẩm quyền phê duyệt (Tập đoàn hoặc Viện trưởng).
  - Căn cứ pháp lý: Các văn bản, chủ trương liên quan.
  - Kết cấu 3 phần bắt buộc:
    1. **Lý do / Sự cần thiết**: Nêu cơ sở pháp lý, thực tiễn và tính cấp thiết.
    2. **Nội dung đề xuất / Phương án**: Chi tiết nội dung công việc, giải pháp, dự toán, tiến độ.
    3. **Đề xuất, kiến nghị & Hiệu quả**: Kiến nghị cấp có thẩm quyền phê duyệt hoặc ban hành.
  - Chữ ký:
    - Với Tờ trình gửi cấp trên: Khối ký Viện trưởng.
    - Với Tờ trình nội bộ: Có khối ký `Người viết tờ trình` (bên trái) và `Trưởng đơn vị / KT. Trưởng đơn vị` (bên phải).
- **Các trường động (Schema Fields)**:
  - `SO_KY_HIEU` (text, required): Số và ký hiệu tờ trình.
  - `NGAY_BAN_HANH` (date, required): Ngày lập tờ trình.
  - `KINH_GUI` (multi-line, required): Cơ quan / Lãnh đạo nhận tờ trình.
  - `CAN_CU` (repeatable, required): Căn cứ xây dựng tờ trình.
  - `LY_DO` (textarea, required): Lý do và sự cần thiết.
  - `DE_XUAT_KIEN_NGHI` (textarea, required): Chi tiết nội dung đề xuất và kiến nghị.
  - `NGUOI_KY` (text, required): Người ký tờ trình.
  - `NOI_NHAN` (multi-line, required): Nơi nhận tờ trình.

### 5. Biên bản (Minutes)
- **Tập tin mẫu**: `templates/iemm/09-bien-ban.docx`.
- **Ký hiệu gợi ý**: `Số: …/BB-VCNM` (ghi số khi biên bản quan trọng cần lưu văn thư).
- **Bố cục đặc thù**:
  - Tiêu đề: `BIÊN BẢN` (14pt in hoa đậm).
  - Trích yếu: `[Tên cuộc họp / Buổi làm việc / Nghiệm thu]` (13pt in hoa đậm căn giữa).
  - Cấu trúc thông tin đầu biên bản:
    - Thời gian bắt đầu: `... giờ ... ngày ... tháng ... năm ...`
    - Địa điểm: `Phòng họp ...`
    - Thành phần tham gia: Gồm Chủ trì, Thư ký, Đại diện các đơn vị.
  - Nội dung diễn biến: Tóm tắt các ý kiến phát biểu và trao đổi.
  - Kết luận cuộc họp: Nghị quyết hoặc kết luận của chủ trì cuộc họp.
  - Thời gian kết thúc: Cuộc họp kết thúc vào lúc `... giờ ... cùng ngày`.
  - Khối chữ ký cuối: Bắt buộc có 2 cột ký: `THƯ KÝ` (bên trái) và `CHỦ TRÌ` (bên phải). Lưu ý: Khối CHỦ TRÌ không ghi lại chức vụ vì phần đầu biên bản đã nêu.
- **Các trường động (Schema Fields)**:
  - `THOI_GIAN` (text, required): Thời gian diễn ra cuộc họp.
  - `DIA_DIEM` (text, required): Địa điểm tổ chức.
  - `THANH_PHAN` (repeatable, required): Danh sách các thành phần tham dự.
  - `CHU_TRI` (text, required): Họ tên người chủ trì.
  - `THU_KY` (text, required): Họ tên thư ký biên bản.
  - `NOI_DUNG_DIEN_BIEN` (textarea, required): Diễn biến chi tiết cuộc họp.
  - `KET_LUAN` (textarea, required): Kết luận và phân công trách nhiệm.
  - `NGUOI_KY` (text, required): Đại diện ký xác nhận biên bản.

### 6. Báo cáo (Report)
- **Tập tin mẫu**: `templates/iemm/10-van-ban-chung.docx` (kế thừa mẫu văn bản có tên loại).
- **Ký hiệu gợi ý**: `Số: …/BC-VCNM`.
- **Bố cục đặc thù**:
  - Tiêu đề: `BÁO CÁO` (14pt in hoa đậm).
  - Trích yếu: `Về việc kết quả thực hiện công tác... [kỳ báo cáo]` (13pt đậm).
  - Khối `Kính gửi:`: Dùng khi báo cáo cấp trên (nếu báo cáo nội bộ có thể không có).
  - Bố cục nội dung:
    - Phần I: Kết quả đạt được (số liệu, công việc đã hoàn thành).
    - Phần II: Tồn tại, hạn chế và nguyên nhân.
    - Phần III: Phương hướng, nhiệm vụ kỳ tới và Kiến nghị.
- **Các trường động (Schema Fields)**:
  - `SO_KY_HIEU`, `NGAY_BAN_HANH`, `KY_BAO_CAO`, `KINH_GUI`, `NOI_DUNG`, `KIEN_NGHI`, `NGUOI_KY`, `NOI_NHAN`.

### 7. Thư mời / Giấy mời (Invitation Letter)
- **Tập tin mẫu**: `templates/iemm/12-thu-moi-hop.docx`.
- **Ký hiệu gợi ý**: `Số: …/MH-VCNM`.
- **Các trường động**: `DOI_TUONG_MOI`, `NOI_DUNG_CUOC_HOP`, `THOI_GIAN`, `DIA_DIEM`, `CHU_TRI`, `CHUAN_BI`, `NGUOI_KY`.

### 8. Đơn xin nghỉ phép (Leave Application)
- **Tập tin mẫu**: `templates/iemm-don-xin-nghi-phep-template.docx`.
- **Các trường động**: `HO_TEN`, `DON_VI_CONG_VIEC`, `LOAI_NGHI` (annual, sick, unpaid, other), `TU_NGAY`, `DEN_NGAY`, `LY_DO`, `NGUOI_DUYET`.

---

## Ma trận Các Trường Động Phục vụ Template Fill (Schema Matrix)

Bảng tổng hợp tất cả các trường dữ liệu động hỗ trợ gán dữ liệu tự động hoặc AI trích xuất:

| Tag Trường | Nhãn Giao diện | Kiểu Dữ liệu | Bắt buộc | Nhóm Mẫu áp dụng | Mô tả & Quy cách Chuẩn hóa |
|------------|----------------|--------------|----------|-------------------|----------------------------|
| `SO_KY_HIEU` | Số và ký hiệu | text | Có | Công văn, Quyết định, Thông báo, Tờ trình, Báo cáo | Mã số hiệu văn bản; tự động chuẩn hóa tiền tố `Số:` và đuôi ký hiệu tổ chức. |
| `NGAY_BAN_HANH` | Ngày ban hành | date | Có | Tất cả các mẫu hành chính | Ngày ban hành; UI nhập `dd/mm/yyyy`, xuất Word thành `Hà Nội, ngày DD tháng MM năm YYYY` (đệm số 0 cho ngày <10 và tháng 1,2). |
| `TRICH_YEU` | Trích yếu nội dung | text | Có | Công văn, Quyết định, Tờ trình, Báo cáo | Nội dung tóm lược; loại bỏ lặp tiền tố `V/v:`, không viết hoa chữ cái đầu sau V/v trong công văn. |
| `KINH_GUI` / `NOI_NHAN_TRUC_TIEP` / `DOI_TUONG_NHAN` | Kính gửi | multi-line | Có | Công văn, Tờ trình, Thông báo, Thư mời | Đơn vị nhận văn bản; 1 nơi thì cùng dòng không dấu cuối; từ 2 nơi thì xuống dòng có gạch đầu dòng `-`, dòng giữa kết `;`, dòng cuối kết `.`. |
| `CAN_CU` | Căn cứ ban hành | repeatable | Có | Quyết định, Tờ trình | Danh sách các căn cứ pháp lý; mỗi căn cứ một dòng in nghiêng, kết thúc bằng `;`, dòng cuối kết thúc bằng `.`. |
| `DIEU_KHOAN` | Các điều khoản | repeatable | Có | Quyết định, Quy chế | Nội dung từng Điều trong quyết định; tự động định dạng `Điều X.` in đậm và thụt lề đoạn 1.27cm. |
| `NOI_DUNG` / `NOI_DUNG_CHUNG` | Nội dung văn bản | textarea | Có | Công văn, Thông báo, Báo cáo, Đề án | Thân bài văn bản nghiệp vụ; được làm sạch, loại bỏ các chỉ dẫn placeholder thừa của template. |
| `LY_DO` | Lý do & Sự cần thiết | textarea | Có | Tờ trình, Đơn nghỉ phép | Cơ sở thực tiễn và tính cấp thiết cần ban hành hoặc xin phê duyệt. |
| `DE_XUAT_KIEN_NGHI` / `KIEN_NGHI` | Đề xuất & Kiến nghị | textarea | Có/Không | Tờ trình, Báo cáo | Nội dung kiến nghị cấp có thẩm quyền xem xét, phê duyệt. |
| `THOI_GIAN` | Thời gian | text | Có | Biên bản, Thư mời | Thời gian tổ chức cuộc họp hoặc buổi làm việc (VD: 08 giờ 30, ngày 16/09/2026). |
| `DIA_DIEM` | Địa điểm | text | Có | Biên bản, Thư mời | Địa điểm diễn ra cuộc họp (phòng họp, cơ quan, địa chỉ). |
| `CHU_TRI` | Chủ trì | text | Có | Biên bản, Thư mời | Họ tên người chủ trì cuộc họp. |
| `THU_KY` | Thư ký | text | Có | Biên bản | Họ tên thư ký ghi chép cuộc họp. |
| `THANH_PHAN` | Thành phần tham dự | repeatable | Có | Biên bản | Danh sách các đại biểu, đơn vị tham gia cuộc họp. |
| `NOI_DUNG_DIEN_BIEN` | Nội dung diễn biến | textarea | Có | Biên bản | Chi tiết diễn biến và các ý kiến phát biểu tại cuộc họp. |
| `KET_LUAN` | Kết luận | textarea | Có | Biên bản | Kết luận chính thức của người chủ trì và phân công nhiệm vụ. |
| `NGUOI_KY` | Người ký | text | Có | Tất cả các mẫu hành chính | Họ và tên người ký ban hành văn bản (đặt dưới chức vụ, in đậm). |
| `CHUC_VU_NGUOI_KY` | Chức vụ người ký | text | Tùy chọn | Tất cả các mẫu hành chính | Chức danh lãnh đạo ký: `GIÁM ĐỐC`, `VIỆN TRƯỞNG`, `KT. GIÁM ĐỐC / PHÓ GIÁM ĐỐC`. |
| `NOI_NHAN` | Nơi nhận | multi-line | Có | Công văn, Quyết định, Thông báo, Tờ trình, Báo cáo | Khối nơi nhận chân trang; mỗi nơi gạch `-`, kết `;`, dòng cuối là `Lưu: VT, [đơn vị].` kết `.`. |
| `HO_TEN` | Họ và tên người làm đơn | text | Có | Đơn nghỉ phép | Họ tên nhân viên/cán bộ xin nghỉ phép. |
| `DON_VI_CONG_VIEC` | Đơn vị công tác | text | Có | Đơn nghỉ phép | Phòng ban hoặc bộ phận công tác. |
| `LOAI_NGHI` | Loại nghỉ | select | Có | Đơn nghỉ phép | Danh mục chọn: Nghỉ phép năm (`annual`), Nghỉ ốm (`sick`), Nghỉ không lương (`unpaid`), Khác (`other`). |
| `TU_NGAY` / `DEN_NGAY` | Nghỉ từ ngày / đến ngày | date | Có | Đơn nghỉ phép | Khoảng thời gian xin nghỉ; hệ thống tự động kiểm tra `TU_NGAY <= DEN_NGAY`. |
| `NGUOI_DUYET` | Người duyệt | text | Có | Đơn nghỉ phép | Lãnh đạo phụ trách phê duyệt đơn. |

---

## Bảng Regex Nhận diện Placeholder Dự phòng (Fallback Regex Map)

Khi tệp DOCX là mẫu tự do không chứa sẵn Word Content Control, công cụ xử lý văn bản web cần áp dụng bảng quy tắc Regex sau để nhận diện và thay thế chính xác vị trí hiển thị:

| Trường Form | Regex Nhận diện Vị trí trong Văn bản | Chuỗi Thay thế Mẫu |
|-------------|---------------------------------------|---------------------|
| `SO_KY_HIEU` | `/^Số:\s*(\S*\/.*\|\.\.\.\|\…\|\[KÝ HIỆU\])/i` | `Số: ${val}/${cleanSymbol}` |
| `NGAY_BAN_HANH` | `/(?:ngày\s+[…\.\d\[\]dm]+\|\bngày\s+)\s*tháng\s+[…\.\d\[\]m]+\s*năm\s+[…\.\d\[\]y]+/i` | `Hà Nội, ngày ${DD} tháng ${MM} năm ${YYYY}` |
| `TRICH_YEU` | `/^(?:V\/v\|Về việc:?)\s*(?:[…\.…]\|\[.*\])/i` | `${prefix} ${subjectClean}` |
| `KINH_GUI` | `/^Kính gửi:?\s*(?:\[.*\]\|\(.*\))/i` hoặc dòng chấm: `/^-\s*[…\.]{3,}[;；]?$/` | `Kính gửi: ${donVi}` hoặc `- ${donVi};` |
| `NOI_NHAN` | `/^-\s*[…\.]{3,}[;；]?$/` (nằm trong khối Nơi nhận) | `- ${donVi};` và `Lưu: VT, Văn phòng.` |
| `NGUOI_KY` | `/\[Họ và tên\]\|\(Họ và tên\)/i` (nằm dưới chức vụ) | `${hoVaTen}` (in đậm) |
| `NOI_DUNG` | `/^\[(?:Nội dung\|Nội dung do Trung tâm\|Mở đầu:).*\]$/i` | `${noiDungNghiepVu}` |

---

## Khuyến nghị Kiến trúc cho TVCI Web Application

1. **Bộ Trình soạn thảo & Xuất nhập DOCX (R1)**:
   - Sử dụng thư viện `docx` (hoặc `docx-templates` / OpenXML DOM) trên Next.js để tái tạo chính xác các thuộc tính OpenXML:
     - Bảng không viền (`<w:tblBorders><w:none/></w:tblBorders>`) cho Header và Footer 2 cột.
     - Lề trang (Section PageMargins): Top `1134` dxa (20mm), Bottom `1134` dxa (20mm), Left `1701` dxa (30mm), Right `850` dxa (15mm).
     - Thụt lề đoạn: `w:firstLine="720"` dxa (12.7mm / 0.5in).
     - Giãn dòng: `w:line="288"` dxa (`1.2 lines`), `w:lineRule="auto"`.
     - Khoảng cách đoạn: `w:before="40"` dxa (2pt), `w:after="40"` dxa (2pt).
2. **Bộ máy Phân tích & Chuẩn hóa Thể thức (Audit Engine - R2)**:
   - Áp dụng nguyên vẹn mô hình chấm điểm 4 trạng thái (`PASS`, `FAIL`, `MISSING`, `NOT_APPLICABLE`) từ `src/rules/document-evaluator.ts`.
   - Tính toán `healthScore` chính xác theo công thức: `healthScore = (passedRules / applicableRules) * 100`, loại trừ tài liệu trắng và các quy tắc không áp dụng.
   - Cung cấp danh sách các bản vá định dạng (`FormattingPatch`) để người dùng có thể nhấp "Sửa lỗi" theo từng dòng hoặc "Sửa an toàn toàn bộ".
3. **Thư viện Mẫu biểu & Dynamic Fill (R3)**:
   - Lưu trữ các tệp DOCX gốc trong thư mục `/public/templates/` của Next.js để sẵn sàng tải vào trình soạn thảo.
   - Sử dụng chung lược đồ `FORM_SCHEMA_REGISTRY` 8 nhóm loại văn bản và hệ thống chuẩn hóa giá trị từ `form-validation.ts`.
4. **AI Workspace với Cơ chế Diff Preview (R4)**:
   - Áp dụng nghiêm ngặt các nguyên tắc hành chính trong `ADMINISTRATIVE_AI_RULES`: không bịa số liệu/căn cứ, không đưa thẻ markdown thừa vào văn bản nghiệp vụ, giữ nguyên ranh giới đoạn.
   - Thiết lập giao diện xem trước sự khác biệt (Diff preview: thêm màu xanh, xóa màu đỏ gạch ngang) trước khi chèn văn bản do OpenAI hoặc Gemini sinh ra vào tài liệu đang soạn.
