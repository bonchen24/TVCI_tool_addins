# Báo cáo Bàn giao Kỹ thuật (Handoff Report) — M1 Explorer 3

## 1. Observation (Quan sát trực tiếp)
- `ORIGINAL_REQUEST.md`: Dòng 16-20 yêu cầu xây dựng Web Application Next.js 14, Tiptap editor engine, chuẩn hóa theo Nghị định 30/2020/NĐ-CP, hỗ trợ nhập/xuất DOCX chuẩn Microsoft Word.
- `PROJECT.md`: Dòng 6 và 18 (Feature 3) đặc tả: "2-Column Administrative Table Nodes: Editor support for header table (Agency + Motto) and footer table (Recipients + Signer) with invisible borders".
- `src/rules/component-rules.ts`: Dòng 16-28 định nghĩa kích thước font và alignment chuẩn cho các thành phần:
  - `NATIONAL_EMBLEM`: Times New Roman, 12-13pt, bold, Centered.
  - `MOTTO`: Times New Roman, 13-14pt, bold, Centered.
  - `AGENCY_NAME`: Times New Roman, 12-13pt, Centered.
  - `NUMBER_SYMBOL`: Times New Roman, 13pt, Centered.
  - `PLACE_DATE`: Times New Roman, 13-14pt, italic, Right/Centered.
  - `RECIPIENTS`: Times New Roman, 12pt, bold & italic, Left (items: 11pt, regular).
  - `SIGNER_ROLE`: Times New Roman, 13-14pt, bold, Centered.
- `src/rules/horizontal-rules.ts`: Dòng 9-11 và 28-30 quy định đường kẻ dưới tên cơ quan dài 1/3 - 1/2 dòng chữ, đường kẻ dưới Tiêu ngữ dài bằng đúng dòng chữ Tiêu ngữ.
- `src/taskpane/components/A4DocumentPreview.tsx`: Dòng 155-200 và 468-501 sử dụng grid 2 cột cho Header (tỷ lệ 1fr : 1.12fr ~ 45%:55%) và Footer (tỷ lệ 1fr : 1fr = 50%:50%).

## 2. Logic Chain (Chuỗi lập luận & suy diễn kỹ thuật)
1. **Lựa chọn kế thừa Tiptap Table thay vì Custom Node độc lập:**
   - Word OpenXML lưu bảng đầu trang và chân trang dưới dạng thẻ chuẩn `<w:tbl>` và `<w:tblBorders><w:top w:val="none"/>...`.
   - Nếu tạo node mới lạ (e.g. `adminHeaderContainer`), module DOCX Import/Export (M2) và ProseMirror clipboard sẽ mất khả năng tương thích tự nhiên.
   - Khi kế thừa `@tiptap/extension-table` và thêm các thuộc tính `tableType`, `isBorderless`, `columnRatio`, editor vẫn dùng cấu trúc `table > tableRow > tableCell`, đảm bảo 100% roundtrip DOCX và thao tác bàn phím trơn tru.
2. **Xác định tỷ lệ cột tối ưu:**
   - Chiều rộng khả dụng của trang A4 theo lề NĐ 30 (trái 30mm, phải 15mm) là $165\text{ mm}$ ($624\text{ px}$).
   - Dòng Tiêu ngữ `"Độc lập - Tự do - Hạnh phúc"` (13-14pt bold) dài xấp xỉ $80\text{ mm}$. Nếu chia 50%-50% ($82.5\text{ mm}$), chuỗi này dễ bị ngắt rớt từ khi người dùng tăng font hoặc thêm padding. Vì vậy, tỷ lệ **40% (Trái) - 60% (Phải)** là tỷ lệ an toàn, chống tràn dòng tuyệt đối cho Header.
   - Tại Footer, danh sách Nơi nhận và khối Ký tên có khối lượng trình bày tương đương, nên tỷ lệ **50% - 50%** là cân đối và chuẩn xác nhất.
3. **Cơ chế Viền mờ khi Soạn thảo và Vô hình khi In/Xuất:**
   - Để người dùng biết vị trí click vào ô, bảng được gán viền chấm đứt mờ `1px dashed rgba(203, 213, 225, 0.7)` trên màn hình soạn thảo.
   - Khi in (`@media print`) và khi chuyển đổi sang DOCX (M2), bảng được thiết lập `border: none !important` và `borders: TableBorders.NONE`.
4. **Đường kẻ trang trí hành chính (Horizontal Rules):**
   - Node `AdminRule` được định nghĩa độc lập (atom block), hỗ trợ `kind: 'AGENCY' | 'MOTTO' | 'ABSTRACT'`, ánh xạ trực tiếp sang OOXML drawing line `<wps:wsp>` khi xuất Word.
5. **Cây JSON mẫu tài liệu khởi tạo:**
   - Tạo sẵn một văn bản Công văn TVCI hoàn chỉnh theo đúng chuẩn NĐ 30, nạp sẵn vào editor khi mở trang. Văn bản này thỏa mãn 100% quy tắc kiểm tra của bộ máy Format Engine (M3).

## 3. Caveats (Khu vực chưa khảo sát & Giả định)
- Giả định rằng font chữ `Times New Roman` đã được cài đặt sẵn trên hệ điều hành của người dùng hoặc được nhúng dự phòng trong stylesheet (`@font-face`).
- Tỷ lệ 40%-60% áp dụng cho văn bản hành chính Nhà nước có Quốc hiệu & Tiêu ngữ; với văn bản Đảng (profile `DANG_05_HD_VPTW_2026`) không có Tiêu ngữ, tỷ lệ có thể điều chỉnh linh hoạt thành 50%-50%.

## 4. Conclusion (Kết luận kỹ thuật)
- Thiết kế bảng hành chính 2 cột được hoàn tất và văn bản hóa toàn diện trong file `analysis.md`.
- Kiến trúc gồm 3 thành phần chính:
  1. `AdministrativeTable` & `AdministrativeTableCell`: Mở rộng từ `@tiptap/extension-table` với thuộc tính `tableType`, `isBorderless`, `columnRatio`, `colwidth`.
  2. `AdminRule`: Custom node cho đường kẻ dưới tên cơ quan và Tiêu ngữ.
  3. `defaultDocumentState`: Khối Tiptap JSON chuẩn cho Công văn TVCI.

## 5. Verification Method (Phương pháp độc lập kiểm chứng)
1. Kiểm tra tài liệu thiết kế chi tiết tại:
   `e:\CODING\TVCI_word_addins\.agents\teamwork\m1_explorer_3\analysis.md`
2. Kiểm tra tính hợp lệ cú pháp của cây JSON mẫu:
   Nạp JSON từ Mục 5 của `analysis.md` vào một trình parse JSON (e.g. `JSON.parse(content)`) để xác nhận không có lỗi cấu trúc AST của ProseMirror.
3. Điều kiện vô hiệu hóa kết luận (Invalidation conditions):
   Nếu có yêu cầu không được dùng `@tiptap/extension-table` do xung đột bundle size hoặc yêu cầu các ô bảng phải là React Component View tĩnh không cho chỉnh sửa nội dung bên trong.
