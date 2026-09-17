# Biểu mẫu nhập liệu theo từng loại văn bản — Đặc tả thiết kế

## Mục tiêu

Khi người dùng chọn một biểu mẫu IEMM, TVCI hoặc Văn bản Đảng/Đảng ủy Viện, Task Pane phải mở đúng form nhập liệu của mẫu đó. Người dùng có thể nhập nhanh bằng form, chỉnh trực tiếp trên Word, hoặc dùng AI để đề xuất dữ liệu; chỉ khi người dùng xác nhận thì dữ liệu mới được áp dụng vào tài liệu Word.

## Phạm vi

- Áp dụng cho các mẫu thuộc `IEMM`, `TVCI` và `DANG`.
- Không thêm mẫu hoặc quy cách TKV.
- Giai đoạn đầu hỗ trợ đầy đủ form cho các nhóm: Công văn, Quyết định, Thông báo, Tờ trình, Báo cáo, Biên bản, Thư mời và Đơn nghỉ phép.
- Các mẫu chưa có schema riêng vẫn dùng form chung theo nhóm văn bản và cho phép chèn mẫu trống.
- Không tự sinh số liệu, tên đơn vị, người ký hoặc thông tin thực tế khi người dùng chưa nhập hoặc chưa chấp nhận kết quả AI.

## Luồng người dùng

1. Người dùng chọn tổ chức, phòng/tab và loại biểu mẫu.
2. Người dùng bấm `Mở form` hoặc `Chèn và nhập liệu`.
3. Task Pane hiển thị form theo `template.id`, giữ lại thông tin dùng chung đã nhập trong phiên.
4. Người dùng nhập form hoặc chuyển sang Word để chỉnh trực tiếp.
5. Người dùng chọn một trong các hành động:
   - `Chèn mẫu trống`: chèn DOCX, không yêu cầu trường bắt buộc.
   - `Chèn và điền`: chèn DOCX rồi áp dụng các trường đã nhập.
   - `Áp dụng vào Word`: cập nhật các Content Control đang có trong tài liệu.
6. AI chỉ đọc dữ liệu khi người dùng yêu cầu; kết quả hiển thị dạng bản nháp, cho phép sửa và phải được chấp nhận trước khi áp dụng.
7. Sau khi áp dụng, người dùng vẫn có thể sửa trực tiếp trong Word hoặc quay lại form.

## Kiến trúc

### 1. Registry schema biểu mẫu

Tạo registry tách khỏi `TEMPLATE_CATALOG`, ánh xạ `template.id` hoặc `documentType` vào schema form. Mỗi trường có dạng:

```ts
type TemplateFormField = {
  tag: string;
  label: string;
  type: "text" | "textarea" | "date" | "select" | "multi-line" | "repeatable";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  helpText?: string;
  wordTarget: "content-control" | "selection" | "manual";
};
```

Schema dùng các tag ổn định, không viết tắt tên đơn vị trong nhãn hiển thị. Các nhóm trường chung gồm số/ký hiệu, địa danh-ngày tháng, trích yếu, căn cứ, kính gửi, nội dung, người ký và nơi nhận.

### 2. Nhóm form ban đầu

- `Công văn`: số/ký hiệu, ngày, nơi nhận trực tiếp, trích yếu `V/v`, nội dung, người ký, nơi nhận.
- `Quyết định`: số/ký hiệu, ngày, trích yếu, căn cứ lặp, các điều/khoản, người ký, nơi nhận.
- `Thông báo`: số/ký hiệu, ngày, trích yếu, nội dung, đối tượng nhận, người ký, nơi nhận.
- `Tờ trình`: số/ký hiệu, ngày, kính gửi, căn cứ, lý do, đề xuất/kiến nghị, người ký, nơi nhận.
- `Báo cáo`: số/ký hiệu, ngày, kính gửi khi thuộc trường hợp gửi cấp trên, kỳ báo cáo, nội dung, kiến nghị, người ký, nơi nhận.
- `Biên bản`: thời gian, địa điểm, thành phần, chủ trì, thư ký, nội dung diễn biến, kết luận, người ký.
- `Thư mời`: đối tượng mời, nội dung cuộc họp, thời gian, địa điểm, chủ trì, chuẩn bị, người ký.
- `Đơn nghỉ phép`: họ tên, đơn vị/công việc, loại nghỉ, thời gian từ-đến, lý do, người duyệt.

Các trường chọn nhanh chỉ dùng cho dữ liệu có danh mục ổn định trong project, ví dụ loại văn bản, kiểu nghỉ, preset nơi nhận và vai trò người ký. Danh mục đơn vị/người ký phải cho phép bổ sung cục bộ, không hard-code viết tắt vào văn bản.

### 3. Đồng bộ với DOCX

Các DOCX core phải có Content Control với tag trùng schema. Những tag quản lý đường kẻ hoặc bố cục như `TVCI_HRULE:*` không được coi là trường nhập liệu. Cần có bước kiểm tra XML để bảo đảm mỗi tag form xuất hiện đúng số lần và không trùng ngoài chủ ý.

Mẫu chưa có Content Control vẫn được chèn; Task Pane phải báo rõ trường nào chưa có đích Word và cho phép người dùng chỉnh thủ công, không âm thầm ghi sai vị trí.

### 4. State và lưu cục bộ

Form state thuộc phiên làm việc hiện tại. Có thể lưu bản nháp cục bộ theo `template.id`, tổ chức và loại văn bản; không gửi dữ liệu lên máy chủ. Xóa biểu mẫu người dùng không xóa bản nháp form nếu người dùng chưa yêu cầu.

### 5. AI

AI dùng schema và danh sách tag của mẫu làm nguồn hợp lệ. Kết quả phải được lọc về đúng tag, hiển thị confidence/source, yêu cầu người dùng rà soát các trường dưới ngưỡng tin cậy, rồi mới cho `Áp dụng vào Word`. Phần nội dung tự do vẫn đi qua luồng chấp nhận bản nháp hiện có.

## Quy tắc định dạng và nội dung

- Các giá trị áp dụng vào Word giữ baseline 13pt và quy cách IEMM/Đảng/TVCI tương ứng của profile đang chọn.
- `Kính gửi` dùng đúng quy tắc một nơi/có từ hai nơi như validator hiện có.
- `Nơi nhận` dùng dòng `Như trên;` khi văn bản đã có `Kính gửi` hoặc `Kính trình`; dòng `Lưu:` luôn ở cuối.
- `V/v` không thêm dấu hai chấm và không tự viết hoa chữ đầu.
- Không tự điền tên viết tắt đơn vị nếu form không cung cấp chính xác giá trị đó.

## Xử lý lỗi

- Không có schema: dùng form chung theo `documentType` và báo mẫu đang ở chế độ tương thích.
- Thiếu Content Control: vẫn cho chèn mẫu, liệt kê trường chưa liên kết và không báo thành công giả.
- Word không hỗ trợ PageSetup: vẫn cho chèn/điền biểu mẫu; chỉ bỏ qua chỉnh lề tự động và báo cảnh báo.
- Lỗi Word hoặc lỗi tải DOCX: dừng thao tác, giữ nguyên form state để thử lại.
- AI trả dữ liệu không hợp lệ: không áp dụng, hiển thị lỗi và giữ lại dữ liệu người dùng.

## Kiểm thử và nghiệm thu

- Unit test cho registry: mỗi template core có schema, tag hợp lệ, label không viết tắt đơn vị và không trùng tag ngoài chủ ý.
- Unit test cho validation: required, date, select, repeatable fields, Kính gửi và Nơi nhận.
- Unit test cho adapter Content Control: chỉ cập nhật tag được phép, bỏ qua tag quản lý đường kẻ.
- Source/UI test: nút form xuất hiện trong card mẫu; chèn mẫu trống và chèn-điền là hai hành động riêng; AI phải có bước chấp nhận.
- XML QA: DOCX core chứa đúng tag form và vẫn giữ các tag đường kẻ/header hiện có.
- Build/typecheck/QA hiện có phải tiếp tục đạt.

## Tiêu chí hoàn thành giai đoạn đầu

- Chọn một mẫu core mở đúng form tương ứng.
- `Chèn mẫu trống` không yêu cầu dữ liệu.
- `Chèn và điền` chèn được DOCX rồi cập nhật các trường đã nhập vào Word.
- Người dùng sửa được cả trên form và trên Word.
- AI không tự áp dụng khi chưa được chấp nhận.
- Không làm thay đổi quy cách header, lề, font, Kính gửi, Nơi nhận và đường kẻ đã chuẩn hóa.
