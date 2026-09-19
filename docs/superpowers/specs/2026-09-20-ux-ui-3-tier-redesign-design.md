# Thiết kế UX/UI 3 Tầng: Ribbon - Modal - Taskpane (TVCI Word Add-in)

## 1. Mục tiêu và Nguyên lý cốt lõi (Core Principles)

Dự án `TVCI_word_addins` được tái cấu trúc giao diện theo triết lý **Phân tách trách nhiệm 3 tầng (3-Tier Separation of Concerns)**:

```
+-----------------------------------------------------------------------------------+
| 1. RIBBON (Dải lệnh Word)                                                         |
|    - Thao tác nhanh 1-click (1-Click Actions, Fast Inserts, Quick Layouts)         |
|    - Đóng vai trò phím tắt / điều hướng mở modal hoặc kích hoạt lệnh tức thì     |
+-----------------------------------------------------------------------------------+
| 2. MODAL DIALOG (Cửa sổ thiết lập / kiểm tra / biểu mẫu)                          |
|    - Không gian rộng rãi, menu dọc bên trái, nội dung cấu hình ở giữa            |
|    - Live preview A4 trực quan, lưu mặc định & áp dụng cho văn bản                |
|    - Chứa các tác vụ nặng: Thiết lập văn bản, Kiểm tra chi tiết, Kho biểu mẫu...  |
+-----------------------------------------------------------------------------------+
| 3. TASK PANE (Thanh trợ lý bên phải)                                              |
|    - ĐỘC TÔN VÀ DUY NHẤT: AI SOẠN THẢO & TRỢ LÝ TÀI LIỆU                         |
|    - Giao diện sạch sẽ, tối giản, hiển thị ngữ cảnh (Scope/Chip)                  |
|    - Luồng hội thoại thông minh, phím tắt gợi ý, tác vụ áp dụng/thay thế/sao chép  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Chi tiết 3 Tầng Giao diện

### 2.1. Tầng 1: RIBBON (Thao tác nhanh)
Được tái tổ chức thành 6 nhóm mạch lạc trên dải lệnh Word (`TVCI Tools`):

1. **Nhóm Soạn thảo (Drafting)**:
   - `AiWorkspaceButton`: Mở AI Soạn thảo (kích hoạt và đưa Taskpane vào chế độ sẵn sàng).
2. **Nhóm Văn bản (Document)**:
   - `DocumentSettingsButton`: **Thiết lập văn bản** (Mở Modal cấu hình tài liệu toàn diện).
   - `CheckDocumentButton`: **Kiểm tra văn bản** (Mở Modal kiểm tra thể thức 4 trạng thái).
   - `QuickStandardizeButton`: **Chuẩn hóa 1-click** (Tự động sửa lỗi an toàn và lề trang).
   - `SafeFixButton`: **Sửa an toàn** (Sửa các vi phạm thể thức có thể tự động khắc phục).
   - `RollbackButton`: **Hoàn tác** (Phục hồi trạng thái trước khi chuẩn hóa).
3. **Nhóm Biểu mẫu (Templates)**:
   - `NewFromTemplateButton`: **Mở mới từ mẫu** (Mở Modal Kho biểu mẫu).
   - `TemplateLibraryButton`: **Kho biểu mẫu** (Duyệt theo đơn vị, lĩnh vực).
   - `RecentTemplatesButton`: **Mẫu gần đây** (Mở tab gần đây trong Modal Kho biểu mẫu).
   - `FavoriteTemplatesButton`: **Mẫu yêu thích** (Mở tab yêu thích).
   - `TemplateBuilderButton`: **Tạo biểu mẫu** (Mở Modal Wizard tạo mẫu).
4. **Nhóm Chèn nhanh (Quick Insert)**:
   - `AddresseeButton`: **Kính gửi** (Chèn hoặc căn chỉnh khối Kính gửi).
   - `LegalBasisButton`: **Căn cứ** (Chèn căn cứ pháp lý in nghiêng chấm phẩy).
   - `RecipientsButton`: **Nơi nhận** (Chèn khối nơi nhận chuẩn).
   - `SignerButton`: **Chữ ký** (Chèn chức vụ, họ tên người ký).
   - `AppendixButton`: **Phụ lục** (Chèn trang phụ lục hoặc bảng phụ lục).
   - `OutlineButton`: **Đề mục** (Chèn đề mục I, 1, a, - chuẩn).
5. **Nhóm Bố cục (Layout)**:
   - `StandardA4Button`: **Lề A4 chuẩn** (20-20-30-15 mm).
   - `ToggleOrientationButton`: **Trang ngang/dọc** (Chuyển hướng hoặc cô lập bảng sang trang ngang).
   - `PageNumbersButton`: **Số trang** (Đánh số trang giữa đầu trang theo NĐ30).
   - `FixTableOverflowButton`: **Sửa bảng** (Tự co giãn bảng vừa lề văn bản).
   - `DeleteBlankPagesButton`: **Xóa trang trắng** (Xóa các ngắt trang và đoạn rỗng thừa).
6. **Nhóm Công cụ (Tools)**:
   - `CleanTextButton`: **Làm sạch văn bản** (Xóa khoảng trắng kép, xuống dòng thừa, sửa dấu câu).
   - `ConvertUnicodeButton`: **Chuyển mã Unicode** (Chuyển TCVN3/VNI sang Unicode).
   - `KnowledgeButton`: **Kho kiến thức** (Mở Modal tra cứu và quản lý kiến thức cơ quan).
   - `SettingsButton`: **Cài đặt** (Mở Modal cấu hình kết nối AI & Tùy chọn nâng cao).

---

### 2.2. Tầng 2: MODAL DIALOGS (Thiết lập / Kiểm tra / Biểu mẫu / Cài đặt)

Các Modal được thiết kế chuẩn mực dạng hộp thoại tập trung (hoặc Full Overlay trong Taskpane với responsive layout), không làm chật chội không gian soạn thảo:

#### Modal 1: "THIẾT LẬP VĂN BẢN" (`DocumentSettingsModal.tsx`)
- **Menu dọc bên trái (Left Sidebar Tabs)**:
  1. `Thông tin chung`: Tiêu đề văn bản, Loại văn bản (Công văn, Quyết định, Tờ trình, Báo cáo, Thông báo...), Đơn vị áp dụng.
  2. `Cơ quan ban hành`: Cơ quan chủ quản (cấp trên), Đơn vị ban hành trực tiếp, Tên viết tắt.
  3. `Số/Ký hiệu & Địa danh`: Số thứ tự, Ký hiệu loại/đơn vị, Địa danh ban hành (Hà Nội, Quảng Ninh...), Ngày tháng năm ban hành.
  4. `Căn lề & Đoạn văn`: Lề trên, dưới, trái, phải (mm); Giãn dòng (Line spacing: Exactly/Multiple); Khoảng cách đoạn (Before/After: pt); Thụt đầu dòng (First line indent: mm).
  5. `Cỡ chữ & Thể thức`: Font chính (Times New Roman); Bảng cấu hình cỡ chữ và kiểu chữ (Đậm/Nghiêng/Hoa) cho từng thành phần (Quốc hiệu, Cơ quan, Số ký hiệu, Trích yếu, Nội dung, Nơi nhận, Chữ ký).
  6. `Người ký & Nơi nhận`: Chức vụ người ký, Họ và tên, Danh sách nơi nhận nội bộ và bên ngoài.
  7. `Mẫu thiết lập (Presets)`: Chọn nhanh preset chuẩn:
     - **Nghị định 30/2020/NĐ-CP** (Chuẩn hành chính Nhà nước)
     - **Tập đoàn TKV** (Chuẩn văn bản Tập đoàn Công nghiệp Than - Khoáng sản VN)
     - **Viện Cơ điện Mỏ (IEMM)** (Chuẩn Viện)
     - **Trung tâm TVCI** (Chuẩn TVCI)
     - **Đảng Cộng sản Việt Nam** (Chuẩn thể thức Đảng)
     - **Tùy chỉnh cá nhân**
- **Khu vực trung tâm (Center Content)**:
  - Form điều khiển tương ứng với tab được chọn.
  - Thẻ xem trước trực quan A4 (Live A4 Preview) mô phỏng chính xác vị trí Quốc hiệu, Tiêu ngữ, Cơ quan, Số hiệu, Tiêu đề, Căn lề.
- **Thanh chân trang cố định (Sticky Footer)**:
  - **[Áp dụng cho văn bản này]**: Chỉ thay đổi định dạng và thuộc tính trên tài liệu Word hiện tại mà không làm thay đổi cấu hình mặc định cá nhân.
  - **[Lưu mặc định]**: Lưu các thông số vào hồ sơ người dùng để làm mặc định cho các tài liệu tạo mới về sau.
  - **[Lưu & Áp dụng]**: Vừa lưu làm mặc định, vừa áp dụng ngay lập tức vào văn bản đang mở.

#### Modal 2: "KIỂM TRA VĂN BẢN" (`InspectionModal.tsx`)
- Tách biệt hoàn toàn khỏi Taskpane AI.
- Đánh giá theo **Engine 4 trạng thái**: `PASS`, `FAIL`, `MISSING`, `NOT_APPLICABLE`.
- Hiển thị thanh tiến độ chuẩn xác (ví dụ `24/27 tiêu chuẩn đạt` hoặc cảnh báo `Tài liệu chưa có nội dung để kiểm tra`).
- Bộ lọc theo trạng thái: Tất cả / Lỗi cần sửa / Thành phần còn thiếu / Đã đạt / Không áp dụng.
- Thao tác nhanh trên từng lỗi: "Đi tới đoạn lỗi", "Sửa lỗi này", "Sửa tất cả an toàn", "Giải thích quy định".

#### Modal 3: "KHO BIỂU MẪU" (`TemplateLibraryModal.tsx`)
- Giao diện tra cứu biểu mẫu chuyên nghiệp.
- Danh mục: TVCI, Viện Cơ điện Mỏ, Đảng, Mẫu gần đây, Mẫu yêu thích.
- Chức năng: Tìm kiếm nhanh, Lọc theo phòng ban/loại văn bản, "Điền thông tin và chèn", "Tạo biểu mẫu mới".

#### Modal 4: "TẠO BIỂU MẪU" (`TemplateWizardModal.tsx`)
- Wizard 5 bước tạo biểu mẫu từ tài liệu Word hiện tại hoặc nhập mới.

#### Modal 5: "KHO KIẾN THỨC" (`KnowledgeModal.tsx`)
- Tra cứu thuật ngữ, văn bản quy phạm nội bộ, quy trình và biểu mẫu liên quan.

#### Modal 6: "CÀI ĐẶT" (`AiSettingsModal.tsx`)
- Cấu hình nhà cung cấp AI (Google Gemini, OpenAI, Ollama), API key, Model discovery, Xóa cache.

---

### 2.3. Tầng 3: TASK PANE (Độc quyền cho AI Soạn thảo)

Taskpane bên phải Word giờ đây hoàn toàn giải phóng khỏi các tab cồng kềnh ("Kiểm tra", "Biểu mẫu", "Tiện ích", "Hồ sơ"). Nó trở thành **Trợ lý AI Soạn thảo chuyên sâu**:

1. **Thanh tiêu đề (Header)**:
   - Tên thương hiệu: **TVCI AI** (hoặc *Trợ lý Soạn thảo*).
   - **Context Chip**: Hiển thị trạng thái tài liệu hiện tại, ví dụ: `[Trung tâm TVCI · Công văn]`. Khi nhấp vào Chip này, **Modal Thiết lập văn bản** sẽ lập tức mở ra để người dùng chỉnh sửa nhanh.
   - Nút **[+ Cuộc trò chuyện mới]**: Bắt đầu luồng hội thoại AI mới.
   - Nút **[⚙️ Cài đặt]**: Mở nhanh Modal Cài đặt AI.
2. **Khu vực Ngữ cảnh AI (AI Context Banner)**:
   - Hiển thị phạm vi đang làm việc:
     - 🟢 *Toàn bộ tài liệu (X từ)*
     - 🔵 *Đoạn đang chọn (Y từ)*
   - Huy hiệu biểu mẫu hoặc tài liệu tham khảo đính kèm (nếu có).
3. **Thanh gợi ý nhanh (Quick Prompts Bar)**:
   - Dãy chip cuộn ngang tiện lợi:
     - `✍️ Soạn tiếp`
     - `🔄 Viết lại trang trọng`
     - `✂️ Rút gọn`
     - `📝 Mở rộng ý`
     - `🔍 Soát chính tả & ngữ pháp`
     - `📌 Tạo Kính gửi`
     - `📋 Tạo Nơi nhận`
     - `⚖️ Soạn Căn cứ pháp lý`
     - `❓ Kiểm tra thông tin còn thiếu`
4. **Luồng hội thoại AI (Chat Thread)**:
   - Lịch sử câu hỏi của người dùng và phản hồi của trợ lý AI.
   - Phản hồi có định dạng Markdown rõ ràng, làm nổi bật các đoạn văn bản đề xuất.
   - **Hộp hành động tích hợp ngay dưới mỗi câu trả lời của AI**:
     - `[Áp dụng]`: Chèn văn bản trực tiếp vào vị trí con trỏ trong Word.
     - `[Thay thế đoạn chọn]`: Thay thế đoạn văn bản đang bôi đen.
     - `[Chèn bên dưới]`: Thêm đoạn đề xuất xuống dưới đoạn đang chọn.
     - `[Sao chép]`: Copy nội dung vào clipboard.
     - `[Lưu vào kho kiến thức]`: Lưu câu trả lời thành kinh nghiệm nghiệp vụ trong Modal Kiến thức.
     - `[Hoàn tác]`: Thu hồi thay đổi vừa áp dụng.
5. **Khung nhập liệu & Điều khiển (Input Area)**:
   - Textarea tự co giãn với phím tắt `Enter` để gửi, `Shift + Enter` để xuống dòng.
   - Chọn phong cách văn phong: *Hành chính trang trọng*, *Ngắn gọn súc tích*, *Nghị định 30*, *Thuyết phục*.
   - Nút đính kèm tệp tham khảo (Word / Text) vào ngữ cảnh AI.

---

## 3. Kiến trúc Kỹ thuật & Tương thích

1. **State Management & Routing**:
   - `App.tsx` quản lý active modal thông qua state:
     `activeModal: "none" | "document_settings" | "inspect" | "template_library" | "template_wizard" | "knowledge" | "ai_settings"`.
   - URL Query Parameter Routing (`?view=settings`, `?view=inspect`, `?view=library`, `?view=builder`, `?view=knowledge`, `?view=settings_modal`):
     Khi người dùng nhấn các nút trên Ribbon có `<Action xsi:type="ShowTaskpane">`, Taskpane tự động bắt tham số URL để bật modal tương ứng trên nền AI Taskpane.
2. **Không phá hủy chức năng hiện có**:
   - Tái sử dụng trọn vẹn: `evaluateDocumentRules`, `inspectDocumentParagraphs`, `applyIssueFix`, `applyTextIssueFix`, `applyA4Margins`, `autoFitTableToWindow`, `cleanBlankPagesSafe`, `applyInversePatches`, `searchTemplates`, `insertTemplate`, `getAllKnowledgeRecords`, `requestAiPromptDirect`.
3. **Đảm bảo tính bao phủ của Test**:
   - Thêm unit test cho `document-settings.ts` (mô hình cài đặt, chuyển đổi đơn vị, presets).
   - Thêm test cho Modal opening routes và Taskpane AI context chip.
   - Giữ nguyên 135/135 tests hiện có luôn PASS.
