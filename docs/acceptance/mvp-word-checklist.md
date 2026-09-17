# TVCI Word Tools — MVP Word Acceptance Checklist

Run on Windows desktop Microsoft Word.

- [ ] `TVCI Word Tools` is sideloaded successfully.
- [ ] Ribbon tab `TVCI Tools` appears.
- [ ] `Mở TVCI Word Tools` opens the task pane.
- [ ] Task pane mở gọn với khu vực `Chuẩn hóa`; các nhóm `Soạn thảo chuẩn`, `Kho biểu mẫu`, `Hướng dẫn` và `Tạo biểu mẫu` mặc định được thu gọn.
- [ ] Các nút chức năng trên Ribbon mở đúng nhóm tương ứng trong task pane.
- [ ] Selecting text and pressing `Đọc đoạn chọn` displays the selected content.
- [ ] `Kiểm tra` detects a known wrong font, size, alignment, or paragraph spacing.
- [ ] Pressing `Sửa` on one issue changes only that supported property for that selected paragraph.
- [ ] `Chèn biểu mẫu` inserts `sample-template.docx` at the document end.
- [ ] Entering a customer name and pressing `Điền TEN_KHACH_HANG` updates the tagged Content Control.
- [ ] With Direct AI API configured, opening `AI Soạn thảo` and pressing `Gửi AI soạn thảo` returns a preview.
- [ ] Before pressing an apply button, the Word document remains unchanged by AI.
- [ ] `Chấp nhận bản này` marks the selected AI draft as approved without changing Word.
- [ ] `Chấp nhận & thay đoạn chọn` replaces the current selection with the approved AI draft.
- [ ] `Chấp nhận & chèn bên dưới` inserts the approved AI draft below the current selection.
- [ ] If the Word selection changes after the draft was loaded, applying the guarded draft is rejected without overwriting the new selection.
- [ ] After an apply action, the draft must be accepted again before it can be applied a second time.
- [ ] Gateway-down/provider-down errors are shown as concise task-pane messages, not raw stack traces.
- [ ] `AI Workspace` opens with the three tabs `Soạn thảo`, `Điền biểu mẫu`, and `Kiểm tra lỗi`.
- [ ] After pressing `Đọc tài liệu hiện tại`, sending a chat request includes the loaded document context; the pane shows the detected document type when available.
- [ ] A chat request without first pressing `Đọc tài liệu hiện tại` does not include the full Word document; quick actions that require context may read it explicitly.
- [ ] Recent chats can be reopened, renamed, deleted individually, and cleared only after confirmation.
- [ ] Proofreading shows category, current text, suggestion, explanation, and position/context when returned by AI; safe fixes do not auto-apply administrative style changes.
- [ ] Applying a full proofreading result is rejected without changing Word when the current selection does not match the text that was checked.
- [ ] A template-fill preview shows only Content Control tags that actually exist in the current document before `Điền vào biểu mẫu` is pressed.
- [ ] If AI omits a real Content Control, the preview still shows it as `Chưa xác định` and it remains excluded from the fill action.
- [ ] `Soạn phần nội dung còn thiếu` shows a preview and requires `Chấp nhận bản này` before `Chấp nhận & chèn bên dưới` can write to Word.
- [ ] The standard drafting area inserts native Word bullet/number lists, supports list levels, and does not create fake marker text.
- [ ] `Kính gửi` and `Nơi nhận` insertions follow the selected rule profile; a multiline `Kính gửi` uses the expected hyphen and punctuation pattern.
- [ ] `Kiểm tra` requires the `Nơi nhận:` label punctuation and validates multiline recipient typography without treating the following signer title as a recipient line.
- [ ] Page numbers can be enabled/disabled without removing user-created numbering; Header/Footer remain off unless explicitly enabled.

## Direct API settings

- [ ] Chọn OpenAI, nhập model + API key, lưu cấu hình và tải lại task pane; cấu hình vẫn được khôi phục.
- [ ] Chọn Gemini; model mặc định đổi sang Gemini.
- [ ] Bấm Xóa key; key biến mất khỏi UI sau khi tải lại task pane.
- [ ] Gọi AI khi thiếu key/model phải báo lỗi rõ ràng và không sửa tài liệu.
- [ ] AI trả kết quả chỉ hiển thị preview; chỉ thay Word sau khi bấm nút xác nhận.
