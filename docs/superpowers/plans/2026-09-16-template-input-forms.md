# Kế hoạch triển khai biểu mẫu nhập liệu theo loại văn bản

> **Lưu ý thực thi:** triển khai trực tiếp trong workspace hiện tại vì thư mục này không có Git repository để tạo worktree riêng. Các vòng TDD sẽ ghi nhận test đỏ trước khi sửa mã sản phẩm.

## Mục tiêu

Tạo registry/schema form độc lập với catalog cho IEMM, TVCI và Văn bản Đảng/Đảng ủy Viện; cung cấp ba thao tác riêng trên mỗi thẻ mẫu; đồng bộ an toàn với Content Control; lưu nháp cục bộ; và giữ nguyên thể thức, 8 tab TVCI cùng các luồng AI hiện có.

## Ràng buộc đã chốt

- Chỉ hiển thị IEMM, TVCI và DANG; không thêm TKV hoặc NĐ30 độc lập vào UI.
- Giữ nguyên chính xác tám mục `TVCI_TEMPLATE_TABS`, trong đó hai mục chờ bổ sung không tự đặt tên mới.
- Không thay đổi body margin A4 20/20/30/15 mm, Times New Roman 13 pt, quy tắc V/v, Kính gửi, Nơi nhận, tên đầy đủ tổ chức và header nở phải 5 mm rồi trái 5 mm.
- Content Control chỉ được cập nhật khi tag thuộc schema; tag `TVCI_HRULE:*` là tag bố cục và luôn bị bỏ qua.
- AI chỉ tạo đề xuất có source/confidence; đề xuất phải được chấp nhận vào form rồi người dùng mới áp dụng vào Word.

## Các bước TDD

- [x] Tạo test đỏ cho registry 8 nhóm, coverage template core, tag/label hợp lệ và loại trừ TKV.
- [x] Tạo test đỏ cho validation required/date/select/repeatable, chuẩn hóa V/v, Kính gửi và Nơi nhận.
- [x] Tạo test đỏ cho draft key/storage theo `template.id` + organization + document type.
- [x] Tạo test đỏ cho Content Control adapter: allowlist schema, bỏ qua `TVCI_HRULE:*`, báo trường thiếu.
- [x] Tạo test đỏ cho AI form prompt/parser và nguyên tắc chưa ghi Word trước khi chấp nhận.
- [x] Tạo test đỏ source/UI cho component form, ba nút trên mỗi card và việc tách form khỏi `App.tsx`.
- [x] Tạo XML QA đỏ cho các DOCX core: tag form đúng schema, tag layout vẫn còn, không trùng tag ngoài chủ ý.
- [x] Implement registry/schema và mapping fallback tương thích cho template chưa có schema riêng.
- [x] Implement validation/normalization và local draft storage không dùng server.
- [x] Implement Word adapter và luồng chèn mẫu trống, chèn-điền, áp dụng vào Word với cảnh báo thiếu Content Control/PageSetup.
- [x] Tách form UI thành `TemplateFormPanel` và service orchestration; nối vào kho template hiện tại.
- [x] Nối AI đề xuất theo schema, hiển thị source/confidence, chỉ merge vào form sau chấp nhận.
- [x] Gắn Content Control vào DOCX core cần thiết bằng script/package-safe update, không làm thay đổi XML header/layout.
- [x] Chạy toàn bộ unit/QA, typecheck và build; local manifest QA đạt. `npm run validate-manifest` đã được chạy thực tế nhưng dịch vụ online từ chối kết nối/upload trong sandbox.
- [x] Ghi execution record cho ChatGPT/C2C với các lệnh và kết quả thực tế (`c2c_9f4a`).

## File dự kiến

- `src/templates/form-schema.ts`
- `src/templates/form-validation.ts`
- `src/templates/form-drafts.ts`
- `src/word/form-content-control.service.ts`
- `src/ai/template-form.ts`
- `src/taskpane/TemplateFormPanel.tsx`
- `src/taskpane/template-form.service.ts`
- `src/taskpane/App.tsx`
- `tests/templates/template-forms.test.ts`
- `tests/content-controls/form-content-control.test.ts`
- `tests/ai/template-form.test.ts`
- `qa/template-form-ui.node.test.ts`
- `qa/template-form-xml.node.test.ts`
- các DOCX core trong `templates/`

## Tiêu chí kiểm tra cuối

`npm run test:qa`, `npm run typecheck`, `npm run build` và `npm run validate-manifest` đều phải chạy thành công; unit test cũng phải xanh. Kết quả phải được ghi lại, không suy đoán từ source.
