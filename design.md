# Thiết Kế Hệ Thống Dự Án: TVCI Word Add-in
> **Bộ công cụ Trợ lý Soạn thảo & Chuẩn hóa Thể thức Văn bản Hành chính**
> **Áp dụng cho**: Trung tâm Thử nghiệm - Kiểm định Công nghiệp (TVCI), Viện Cơ điện Mỏ (IEMM) - Vinacomin, và Văn bản Đảng.
> **Tiêu chuẩn pháp lý**: Nghị định 30/2020/NĐ-CP của Chính phủ và Quy chế văn thư nội bộ Tập đoàn TKV / Viện IEMM.

---

## 1. Tổng Quan Dự Án (Project Overview)

### 1.1. Bối cảnh & Mục tiêu
Dự án `TVCI_word_addins` được xây dựng nhằm giải quyết bài toán cốt lõi của cán bộ, chuyên viên, kỹ sư trong các đơn vị trực thuộc Tập đoàn TKV và Viện Cơ điện Mỏ:
1. **Chuẩn hóa thể thức**: Tuân thủ tuyệt đối quy định trình bày văn bản hành chính theo Nghị định 30/2020/NĐ-CP (căn lề, cỡ chữ, font Times New Roman, Quốc hiệu, Tiêu ngữ, số ký hiệu, trích yếu, chữ ký, nơi nhận).
2. **Soạn thảo thông minh với AI**: Tự động chuyển đổi ý tưởng/ghi chú thô của người dùng thành văn bản hành chính trang trọng, tự nhận diện và bóc tách thành các trường dữ liệu theo biểu mẫu.
3. **Quản lý biểu mẫu chuyên ngành**: Tích hợp sẵn kho biểu mẫu kỹ thuật (thử nghiệm vật liệu, hiệu suất năng lượng, quan trắc môi trường, giám định kỹ thuật, công văn, quyết định, biên bản, văn bản Đảng).
4. **Độc lập, an toàn & ổn định**: Hoạt động hoàn toàn trên môi trường máy trạm nội bộ (Local Offline/LAN), không phụ thuộc vào internet công cộng để chạy add-in, bảo mật dữ liệu văn bản cơ quan.

---

## 2. Kiến Trúc Tổng Thể Hệ Thống (System Architecture)

Hệ thống được thiết kế theo mô hình **Client - Local Server** khép kín:

```
+---------------------------------------------------------------------------------------+
| MICROSOFT WORD DESKTOP (Office 2016 / 2019 / 2021 / Office 365)                       |
|                                                                                       |
|  [ Ribbon Command Surface ] ---- (ExecuteFunction) ----> commands.html / commands.js   |
|            |                                                         |                |
|            | (ShowTaskpane)                                          | (displayDialog)|
|            v                                                         v                |
|  [ Task Pane: Form Fields & Selection AI ]             [ Office Dialog Modal ]        |
|  (taskpane.html: React 18 / TypeScript)               (dialog.html: React 18)         |
+---------------------------------------------------------------------------------------+
                                    | (HTTPS: localhost:38473)
                                    v
+---------------------------------------------------------------------------------------+
| LOCAL ADD-IN HOST SERVICE (C:\Users\<User>\AppData\Local\TVCIWordTools)              |
|                                                                                       |
|  +-----------------------------------+   +-----------------------------------------+  |
|  | Watchdog Launcher (launcher.vbs)  |   | Local Node.js HTTPS Server (server.js)  |  |
|  | - Chạy ẩn ngầm không hiện cửa sổ |<->| - Cổng 38473 (HTTPS tự ký bảo mật)      |  |
|  | - Giám sát & tự hồi phục server  |   | - Phục vụ static web assets (dist/)     |  |
|  | - Nhận biết marker .tvci-stop     |   | - Proxy / Logging / API sức khỏe        |  |
|  +-----------------------------------+   +-----------------------------------------+  |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  | Bundled Runtime: Node.js x64 Portable + WebView2 Bootstrapper + Templates .docx |  |
|  +---------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

### 2.1. Thành phần Công nghệ cốt lõi
- **Language & Platform**: TypeScript (Strict Mode), React 18, Webpack 5.
- **Office Integration**: Office.js API (`Word.run`, `context.sync()`, `ContentControl`, `displayDialogAsync`, `messageParent`).
- **Local Host**: Node.js HTTP/HTTPS Server tích hợp chứng chỉ SSL tự ký đáng tin cậy trên Windows Root CA.
- **Process Keeper**: VBScript Watchdog Launcher chạy ẩn ngầm, đảm bảo add-in luôn sẵn sàng khi mở Word.
- **Installer**: Inno Setup đóng gói toàn bộ (.exe standalone ~29.7 MB), cài đặt 1-click không cần kết nối mạng.

### 2.2. Năng lực mặc định của editor web
- Editor trong `web_app` mặc định kiểm tra chính tả tiếng Việt cục bộ. `web_app/data/spellcheck/Vietnamese.dic` giữ nguyên bytes nguồn UTF-16LE; bước chuẩn bị trước `dev`/`build` kiểm tra SHA-256, chuẩn hóa entry sang NFC và xuất từ điển UTF-8 được phục vụ cùng ứng dụng. Header số đếm đầu tệp, nếu có, chỉ được nhận diện và bỏ qua; giá trị không cố định và không dùng để xác nhận số entry.
- Từ điển nền kết hợp các entry hợp lệ từ `Vietnamese.dic` với Hunspell hiện có để giữ hỗ trợ và gợi ý; đây là tín hiệu phát hiện nghi vấn, không phải nguồn chân lý tuyệt đối. Entry lỗi định dạng, trùng sau chuẩn hóa hoặc đáng nghi bị loại và được ghi lý do vào `vi-base.review.json` để rà soát.
- Tách riêng ba lớp: từ điển nền; ngoại lệ thuật ngữ TVCI/tiêu chuẩn; và từ/cụm do người dùng chủ động thêm. Cụm dễ nhầm theo ngữ cảnh như “sử lý/xử lý” và “xát nhận/xác nhận” có rule riêng dù từng âm tiết hợp lệ.
- Việc quét khi nhập được debounce. Từ hoặc cụm nghi ngờ được gạch chân; bấm hoặc mở ngữ cảnh trên vị trí đó dẫn tới bảng gợi ý.
- Kiểm tra toàn văn bản có lệnh riêng. Kết quả chính tả và trình bày/ngữ pháp cơ bản nằm ở hai nhóm riêng; người dùng có thể nhảy tới lỗi, chọn gợi ý sửa, bỏ qua một lần hoặc chủ động thêm từ vào từ điển.
- Không tự sửa văn bản. Nội dung chỉ đổi sau thao tác sửa rõ ràng của người dùng.
- Quy tắc giảm false-positive bỏ qua URL, email, số, ngày, mã văn bản/mã tiêu chuẩn, một số chữ viết tắt phổ biến và chuỗi viết hoa đặc thù; danh sách ngoại lệ TVCI và từ người dùng có thể mở rộng.
- Từ người dùng chủ động thêm được lưu dưới dạng tùy chọn từ điển riêng của tài khoản trong SQLite; người dùng có thể xem và xóa. API chỉ nhận từ/cụm được chọn, không nhận văn bản tài liệu.
- Trước khi xuất DOCX hoặc lưu/lưu bản sao lên Google Drive, editor quét lại. Nếu còn mục nghi ngờ chính tả, cảnh báo số lượng và cho phép quay lại hoặc tiếp tục; cảnh báo không tự sửa và không chặn cứng.

---

## 3. Kiến Trúc Giao Diện 2 Tầng (2-Tier UX/UI Architecture)

Triết lý thiết kế tuân thủ nghiêm ngặt **Phân tách trách nhiệm (Separation of Concerns)**, loại bỏ hoàn toàn Task Pane gây chật chội màn hình soạn thảo:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TẦNG 1: RIBBON (Thanh công cụ Word)                                                     │
│ - Điều hướng nhanh, 100% lệnh ExecuteFunction mở Modal hoặc thực thi trực tiếp          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
        │
        ├────────────────────────────────────────────────────────────────────────┐
        ▼                                                                        ▼
┌────────────────────────────────────────┐             ┌────────────────────────────────────────┐
│ TẦNG 2: MODAL DIALOGS (TRUNG TÂM)      │             │ LỆNH THAO TÁC TRỰC TIẾP TRÊN WORD      │
│ (Hộp thoại nổi gọn gàng, tự đóng)      │             │ (1-Click Direct Actions - Khắc phục ngay)│
│                                        │             │                                        │
│ 1. Soạn thảo AI phân mảnh thông minh   │             │ - Căn chuẩn lề trang A4                │
│ 2. Thiết lập văn bản cơ quan / ký duyệt│             │ - Đánh số trang NĐ30 (trên - giữa)     │
│ 3. Kiểm tra thể thức văn bản           │             │ - Tự co giãn bảng biểu vừa khít lề     │
│ 4. Kho biểu mẫu chuyên ngành           │             │ - Xóa trang trắng & dòng thừa an toàn  │
│ 5. Cài đặt AI & API Key                │             │ - Chèn Kính gửi, Căn cứ, Nơi nhận...   │
└────────────────────────────────────────┘             └────────────────────────────────────────┘
```

---

### 3.1. Tầng 1: Thanh Công Cụ Ribbon (`manifest/manifest.xml`)

Được tổ chức thành 5 nhóm trực quan, **100% lệnh sử dụng `ExecuteFunction`** (không mở Task Pane che chắn khung Word):

| Nhóm Ribbon | Nút điều khiển | Loại Action | Chức năng chi tiết |
| :--- | :--- | :--- | :--- |
| **1. AI** | **Soạn thảo AI** (`SmartDraftingButton`) | `ExecuteFunction` (`openSmartDraftingDialog`) | Mở Modal Soạn thảo AI 4 bước: Chọn mẫu -> Dán ý tưởng -> Phân mảnh trường & Chọn drop-list -> Chèn vào Word. |
| **2. Văn bản** | **Tạo văn bản** (`CreateDocMenu`) | Menu Dropdown | Tạo khung chuẩn: Công văn, Quyết định, Thông báo, Tờ trình, Báo cáo, Kế hoạch, Biên bản, Giấy mời, Phiếu. |
| | **Thiết lập** (`DocumentSettingsButton`) | `ExecuteFunction` (`openDocumentSettingsDialog`) | Mở Modal cấu hình thể thức, lề trang, cơ quan, người ký. |
| | **Kiểm tra** (`CheckDocumentButton`) | `ExecuteFunction` (`openInspectorDialog`) | Mở Modal kiểm tra thể thức 4 trạng thái theo NĐ30. |
| | **Chuẩn hóa** (`QuickStandardizeButton`) | `ExecuteFunction` (`run1ClickStandardize`) | 1-Click sửa toàn bộ lỗi thể thức an toàn và áp lề A4. |
| **3. Chèn nhanh** | **Chèn nhanh** (`QuickInsertMenu`) | Menu Dropdown | Chèn các khối thể thức: Kính gửi, Căn cứ pháp lý, Nơi nhận, Chữ ký, Phụ lục, Đề mục chuẩn. |
| **4. Bố cục** | **Trang** (`PageLayoutMenu`) | Menu Dropdown | Căn lề A4 chuẩn, Xoay trang dọc/ngang, Đánh số trang NĐ30, Tự động co bảng vừa lề, Xóa trang trắng. |
| **5. Tài nguyên** | **Kho biểu mẫu** (`TemplateLibraryButton`) | `ExecuteFunction` (`openTemplateLibraryDialog`) | Mở Modal tra cứu và sử dụng toàn bộ biểu mẫu Viện & Trung tâm. |
| | **Nhận kinh nghiệm** (`LearnExperienceButton`) | `ExecuteFunction` (`openLearnExperienceDialog`) | Mở Modal đúc kết tri thức & kinh nghiệm từ văn kiện Word hoàn thiện vào Kho tri thức (có chống trùng lặp). |
| | **Cài đặt** (`SettingsButton`) | `ExecuteFunction` (`openSettingsDialog`) | Cấu hình API Key AI (Gemini, OpenAI, Claude, Local LLM). |

---

### 3.2. Tầng 2: Hệ Thống Modal Dialogs Trung Tâm

Các modal nổi giải quyết các tác vụ chuyên sâu, kích thước nhỏ gọn (~52% chiều rộng, ~62-64% chiều cao màn hình), không che nền tài liệu Word:

#### A. Modal "Soạn thảo AI" (`SmartDraftingModal.tsx`)
Quy trình khép kín 5 bước:
1. **Bước 1: Chọn biểu mẫu**:
   - Bộ lọc đơn vị: *Tất cả*, *Trung tâm TVCI*, *Viện Cơ điện Mỏ (IEMM)*, *Đảng*.
   - Tìm kiếm tiếng Việt không dấu thời gian thực.
2. **Bước 2: Dán nội dung & AI viết lại**:
   - Khung dán ý tưởng/ghi chú thô của người dùng.
   - Phím tắt định hình văn phong nhanh (`DRAFT_PROMPT_PILLS`): *Chuẩn NĐ30*, *Trang trọng hơn*, *Soát lỗi chính tả*, *Rút gọn súc tích*, *Mở rộng diễn giải*.
   - Khung văn bản AI đã chuẩn hóa hiển thị song song, cho phép chỉnh sửa trực tiếp.
3. **Bước 3: Tự động phân mảnh trường dữ liệu**:
   - AI nhận diện và bóc tách các trường: Tiêu đề, Số hiệu, Trích yếu, Kính gửi, Căn cứ, Nội dung, Chức vụ người ký, Họ tên, Nơi nhận.
   - Bảng trường nhập liệu trực quan với **Drop-lists chọn nhanh**:
     - `DIA_DANH`: Hà Nội, Quảng Ninh, Cẩm Phả, Uông Bí, Hạ Long...
     - `CHUC_VU_NGUOI_KY`: GIÁM ĐỐC, PHÓ GIÁM ĐỐC, VIỆN TRƯỞNG, TRƯỞNG PHÒNG...
     - `NOI_NHAN`: Các khối cơ quan chủ quản, Đảng ủy, các phòng ban chuyên môn.
     - `CAN_CU`: Căn cứ NĐ 30/2020/NĐ-CP, quyết định thành lập đơn vị...
4. **Bước 4: Xác nhận & Điền hoàn chỉnh vào Word**:
   - Bấm **"Chèn vào văn bản"**:
     - Tự động nạp mẫu và chèn toàn bộ nội dung hoàn chỉnh vào trang Word.
     - Điền chính xác dữ liệu vào từng thẻ Content Control tương ứng.
     - Tự động đóng modal, để lại không gian soạn thảo 100% thoáng đãng cho người dùng trên Word.

#### B. Modal "Thiết lập văn bản" (`DocumentSettingsModal.tsx`)
- Menu bên trái với 7 nhóm cấu hình: Thông tin chung, Cơ quan ban hành, Số ký hiệu & Địa danh, Căn lề & Đoạn văn (mm/pt), Cỡ chữ & Thể thức chi tiết từng thành phần, Người ký & Nơi nhận, Presets chuẩn (NĐ30, TKV, IEMM, TVCI, Đảng).
- Khung **Live A4 Preview** tương tác hiển thị bố cục trực quan thời gian thực.
- 3 chế độ lưu: *Áp dụng văn bản này*, *Lưu làm mặc định*, *Lưu & Áp dụng*.

#### C. Modal "Kiểm tra thể thức" (`InspectionModal.tsx`)
- Engine kiểm tra thể thức văn bản theo **4 trạng thái**: `PASS`, `FAIL`, `MISSING`, `NOT_APPLICABLE`.
- Định vị trực tiếp vị trí vi phạm trong tài liệu Word.
- Hỗ trợ nút *Sửa an toàn 1-click* và *Hoàn tác (Rollback)* phục hồi trạng thái cũ thông qua `TransactionManager`.

#### D. Modal "Kho biểu mẫu" (`TemplateLibraryModal.tsx`)
- Phân loại biểu mẫu theo tổ chức: TVCI, IEMM, Đảng.
- Lọc theo phòng ban nghiệp vụ (Điện - điện tử, Hiệu suất năng lượng, Thử nghiệm vật liệu, Quan trắc môi trường, Giám định thiết bị mỏ).
- Hỗ trợ lưu mẫu yêu thích (Favorites) và lịch sử sử dụng gần đây (Recent).

#### E. Modal "Nhận kinh nghiệm & Đúc kết tri thức" (`LearnExperienceModal.tsx`)
- Tự động quét và đọc văn kiện hoàn thiện (hoặc đoạn bôi đen đang chọn).
- AI & Heuristics tự động phân tích: Đặt tên gợi nhớ, phân loại (Kinh nghiệm, Mẫu câu, Hướng dẫn, Quy tắc bắt buộc), đơn vị (TVCI, IEMM, Đảng, Chung), mô tả súc tích (2-4 câu), đoạn trích minh họa và từ khóa.
- **Cơ chế chống trùng lặp thông minh (Anti-Duplication Guard)**: Tự động so sánh với kho tri thức hiện hữu qua thuật toán `calculateSimilarity`, cảnh báo khi độ tương đồng >= 65% và cho phép tùy chọn *Cập nhật tri thức đã có* hoặc *Lưu bản ghi mới*.
- Lưu vĩnh viễn vào `IndexedDB` & `localStorage` để tra cứu và làm ngữ cảnh cho AI.

---

## 4. Hệ Thống Thiết Kế (Design System & UI Tokens)

Áp dụng chuẩn thiết kế giao diện Doanh nghiệp / Cơ quan Nhà nước (**Enterprise Trust & Authority**):

### 4.1. Bảng màu (Color Palette)
| Token | Mã màu | Ý nghĩa sử dụng |
| :--- | :--- | :--- |
| **Primary (Brand)** | `#0d4f8b` | Màu xanh Navy chủ đạo của TVCI / Vinacomin, thể hiện uy tín, kỷ cương, trang trọng. |
| **Primary Hover** | `#0a3d6d` | Trạng thái hover trên nút và thẻ tương tác. |
| **Secondary / Accent** | `#0284c7` | Màu xanh da trời điểm nhấn, phân cấp thông tin phụ. |
| **Success / Confirm** | `#16a34a` | Màu xanh lá cho nút hành động chính (Xác nhận, Điền vào Word, Trạng thái PASS). |
| **Warning** | `#b45309` | Trạng thái cảnh báo, thành phần thiếu (`MISSING`). |
| **Danger / Error** | `#dc2626` | Trạng thái lỗi thể thức (`FAIL`), cảnh báo API. |
| **Background (App)** | `#f8fafc` | Nền xám nhạt dịu mắt, chống lóa khi làm việc thời gian dài. |
| **Background (Card)**| `#ffffff` | Nền trắng thẻ nội dung, tương phản cao. |
| **Text Main** | `#1e293b` | Màu chữ chính, tương phản đạt chuẩn WCAG AAA (≥ 7:1). |
| **Text Muted** | `#64748b` | Chữ phụ, nhãn hướng dẫn, metadata. |
| **Border** | `#cbd5e1` / `#e2e8f0` | Đường viền mảnh, phân định rõ ràng các khối thông tin. |

### 4.2. Typography
- **Hệ thống Font giao diện Add-in**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`.
- **Cỡ chữ**: 11px - 12px (tối ưu cho độ rộng màn hình Taskpane 320px - 360px).
- **Văn bản tài liệu Word**: Bắt buộc `Times New Roman` chuẩn thể thức Việt Nam.

### 4.3. Iconography
- Sử dụng **100% SVG Vector Icons** vẽ nét đơn sắc, sắc nét trên màn hình Retina/High-DPI:
  - `EditDocIcon`: Biểu tượng soạn thảo văn bản.
  - `SparkleIcon`: Biểu tượng trợ lý trí tuệ nhân tạo.
  - `CheckIcon`: Biểu tượng hoàn tất, xác nhận thành công.
  - `GearIcon`: Biểu tượng cài đặt tham số.
  - `CloseIcon`: Biểu tượng đóng cửa sổ hộp thoại.
- Loại bỏ hoàn toàn emoji đa sắc lòe loẹt trong các nút công cụ để giữ sự trang nghiêm của văn bản nhà nước.

---

## 5. Dữ Liệu & Khung Biểu Mẫu (Data Models & Content Controls)

### 5.1. Hệ thống Thẻ Content Control chuẩn hóa
Tài liệu Word được kiểm soát thông qua các Content Control có `tag` và `appearance = hidden`:

```
┌────────────────────────────────────────────────────────────┐
│ CO_QUAN_CHU_QUAN          QUOC_HIEU_TIEU_NGU               │
│ CO_QUAN_BAN_HANH                                           │
│ Số: SO_KY_HIEU            DIA_DANH, ngày NGAY_BAN_HANH     │
│                                                            │
│                  TIEU_DE_VAN_BAN                           │
│              Trích yếu: TRICH_YEU                          │
│                                                            │
│ Kính gửi: KINH_GUI                                         │
│                                                            │
│ Căn cứ: CAN_CU                                             │
│                                                            │
│ Nội dung: NOI_DUNG                                         │
│                                                            │
│ Nơi nhận:                 CHUC_VU_NGUOI_KY                 │
│ NOI_NHAN                                                   │
│                           (Chữ ký, con dấu)                │
│                           NGUOI_KY                         │
└────────────────────────────────────────────────────────────┘
```

### 5.2. Danh mục Tag chuẩn
- `CO_QUAN_CHU_QUAN`: Tên cơ quan chủ quản cấp trên (in hoa đứng/nhạt).
- `CO_QUAN_BAN_HANH`: Tên đơn vị ban hành trực tiếp (in hoa đậm).
- `SO_KY_HIEU`: Số và ký hiệu văn bản.
- `DIA_DANH`: Địa danh phát hành văn bản.
- `NGAY_BAN_HANH`: Ngày, tháng, năm ban hành.
- `TRICH_YEU`: Trích yếu nội dung văn bản.
- `KINH_GUI`: Thành phần cơ quan/đơn vị nhận kính gửi.
- `CAN_CU`: Các văn bản pháp quy, cơ sở pháp lý ban hành.
- `NOI_DUNG`: Toàn văn nội dung chính của văn bản.
- `CHUC_VU_NGUOI_KY`: Chức vụ người ký (GIÁM ĐỐC, PHÓ GIÁM ĐỐC, VIỆN TRƯỞNG...).
- `NGUOI_KY`: Họ và tên người ký văn bản.
- `NOI_NHAN`: Danh sách các đơn vị, cá nhân nhận văn bản lưu trữ.

## 6. Kiến trúc Tài khoản, Quyền riêng tư & Lưu trữ

### 6.1. Tài khoản tối thiểu, không thu thập PII
- Tài khoản chỉ sử dụng tên đăng nhập và mật khẩu. Không yêu cầu hoặc thu thập họ tên, email, số điện thoại, địa chỉ, ngày sinh, giới tính hay thông tin định danh cá nhân khác.
- Giao diện đăng ký nhắc người dùng không dùng họ tên thật, email hoặc số điện thoại làm tên đăng nhập.
- Mật khẩu phải được lưu bằng hàm băm mạnh; session dùng cookie `HttpOnly`, `Secure` và `SameSite`.
- Khôi phục tài khoản dùng recovery code thay cho email hoặc SMS.
- Chỉ lưu metadata tài khoản tối thiểu: `internal user_id`, username, password hash, session, `terms_version` và timestamps. Ngoại lệ opt-in là các từ/cụm người dùng chủ động thêm vào từ điển riêng để giảm false-positive; chỉ lưu chính term đó và timestamps, có thể xóa trong editor.
- Người dùng đã đăng nhập có thể đổi mật khẩu bất cứ lúc nào sau khi xác minh mật khẩu hiện tại. Mật khẩu mới tuân theo quy tắc hiện hành; thao tác đổi mật khẩu thu hồi mọi session cũ và cấp một session mới cho trình duyệt hiện tại. Trạng thái bắt buộc đổi mật khẩu vẫn giữ luồng chặn truy cập cho đến khi hoàn tất.
- Người dùng thông thường có thể tự xóa tài khoản sau khi xác minh mật khẩu hiện tại, tích xác nhận rõ ràng và nhập lại đúng username. Việc xóa loại bỏ tài khoản cùng metadata bảo mật cục bộ, các term từ điển riêng của tài khoản và dữ liệu liên quan trong TVCI database.
- Khi xóa tài khoản có kết nối Drive, TVCI cố gắng thu hồi và xóa metadata thông tin xác thực Drive cục bộ; nếu thu hồi thất bại thì vẫn xóa tài khoản cục bộ. Việc này không xóa, đưa vào thùng rác, di chuyển, đổi tên hoặc thay đổi quyền bất kỳ tệp/thư mục nào trên Drive. Người dùng tự xóa tệp Drive trong Google Drive nếu muốn.
- Superadmin không thể tự xóa tài khoản trong phiên bản đầu để tránh mất quyền quản trị. Không bổ sung trường PII cho các luồng tài khoản này.
- Không lưu IP hoặc User-Agent lâu dài nếu không có yêu cầu bảo mật thực sự.

- Recovery codes remain hash-only. After password hashing, a matching unconsumed code must be claimed conditionally inside the same SQLite transaction as password replacement and invalidation of all sessions.

### 6.2. Không lưu nội dung văn bản trên server TVCI
- Nội dung người dùng soạn, chỉnh sửa, chuẩn hóa hoặc tạo với AI không được persist vào SQLite hoặc server TVCI.
- Từ điển chính tả riêng của tài khoản chỉ lưu các term được người dùng bấm thêm; không lưu đoạn văn hoặc toàn văn tài liệu.
- Khi không kết nối Google Drive, tài liệu chỉ tồn tại trong phiên làm việc; người dùng tự lưu bằng cách xuất DOCX/PDF hoặc tải tệp xuống. Ứng dụng không cung cấp lưu trữ lâu dài trên server TVCI.
- Không dùng nội dung để huấn luyện mô hình, profiling, quảng cáo hoặc mục đích ngoài yêu cầu hiện tại.
- Logs và audit không chứa toàn văn tài liệu; chỉ ghi metadata kỹ thuật tối thiểu, không định danh.

### 6.3. Google Drive là lớp lưu trữ cá nhân tùy chọn
- Không dùng Google để đăng nhập TVCI. Google Drive là lớp lưu trữ cá nhân tùy chọn và chỉ được kết nối khi người dùng chủ động opt-in; không kết nối Drive vẫn dùng được editor, chuẩn hóa, biểu mẫu, AI và export.
- Chỉ yêu cầu quyền tối thiểu, ưu tiên scope `drive.file`; không yêu cầu `email`, `profile` hoặc `openid` nếu không cần.
- Không quét, lập chỉ mục hoặc đọc toàn bộ Drive. Chỉ truy cập tệp do ứng dụng quản lý hoặc tệp người dùng chủ động chọn/thêm trong thao tác hiện tại.
- Không tự ý đọc, xóa, chia sẻ hoặc thay đổi quyền của tệp ngoài thao tác người dùng chủ động yêu cầu.
- OAuth token phải được mã hóa. Người dùng có thể disconnect hoặc revoke quyền; khi disconnect, ứng dụng xóa hoặc khóa token ở nơi lưu theo thiết kế và không tự xóa tệp trên Drive.
- Nhóm tác giả và đơn vị phát triển không truy cập nội dung Drive ngoài luồng người dùng chủ động kích hoạt.

### 6.4. Mô hình thư mục Drive theo logic
Các nhóm dữ liệu cá nhân do ứng dụng quản lý được phân tách dưới một thư mục gốc riêng. Tên thư mục vật lý có thể thay đổi khi triển khai; cấu trúc logic sau là canonical trong thiết kế:

```text
TVCI Document Platform/
├── Documents/  — Văn bản người dùng chủ động lưu: tài liệu đang làm, bản đã xuất và bản nháp chỉ khi người dùng bật/chọn lưu.
├── Templates/  — Thư viện cá nhân: mẫu DOCX, mẫu văn bản, biểu mẫu riêng, mẫu đã chỉnh và tài liệu muốn tái sử dụng.
├── Knowledge/  — Tri thức cá nhân: ghi chú, quy tắc, kinh nghiệm, đoạn hướng dẫn và tri thức người dùng chủ động ghi nhớ để tái sử dụng.
├── References/ — Tài liệu tham khảo người dùng chủ động thêm/chọn làm nguồn hỗ trợ.
└── AppData/    — Manifest/index kỹ thuật tối thiểu ánh xạ các tệp do ứng dụng quản lý trong bốn nhóm trên.
```

### 6.5. Tri thức cá nhân (Knowledge)
- Chỉ tạo hoặc lưu tri thức khi người dùng chủ động bấm Lưu/Ghi nhớ/Thêm vào Tri thức hoặc chủ động chọn tài liệu nguồn.
- Không tự động học từ mọi văn bản người dùng soạn; không tự động đưa nội dung chat, AI hoặc document vào Knowledge.
- Knowledge thuộc quyền kiểm soát của người dùng và nằm trong Drive của người dùng nếu họ đã kết nối. Không có Drive thì tri thức chỉ tồn tại tạm trong phiên hoặc không được lưu lâu dài; UI phải thông báo rõ.
- Khi AI dùng Knowledge, chỉ dùng các mục người dùng đã chọn hoặc cho phép trong ngữ cảnh hiện tại.

- AI context selection is in-memory only: keep selected Knowledge/Reference identities and loaded payload together, show queued resources with a remove action before use, send only explicitly checked items, and clear the queue after a successful draft/proofread/template-fill request or document reset.

### 6.6. Thư viện cá nhân (Templates/Library)
- Thư viện cá nhân lưu mẫu và tài liệu tái sử dụng do người dùng chủ động thêm vào `Templates/`.
- Người dùng có thể thêm mẫu, mở mẫu, dùng mẫu để tạo văn bản mới, đổi tên metadata và yêu cầu xóa mẫu khỏi thư viện.
- Không quét Drive để tự nhập mẫu. Thư viện hệ thống mặc định của TVCI có thể nằm trong ứng dụng/repository hoặc nguồn quản trị riêng và phải được phân biệt với Thư viện cá nhân trên Drive người dùng.
- Superadmin không mặc nhiên được đọc Library cá nhân.

### 6.7. Văn bản cá nhân (Documents)
- Người dùng có thể Save, Save As và Open from Drive cho văn bản trong `Documents/`.
- Không autosave liên tục theo mặc định. Chỉ autosave khi người dùng chủ động bật tùy chọn và phải có indicator rõ ràng khi đang autosave.
- Khi chưa kết nối Drive, ứng dụng không persist document body lên server; người dùng chỉ có thể export/download.

### 6.8. Tài liệu tham khảo (References)
- Chỉ thêm vào `References/` các tệp người dùng chủ động chọn/add; không crawl hoặc quét thư mục xung quanh.
- Tệp tham khảo có thể được dùng cho AI/context/tra cứu trong phiên. Chỉ lưu reference pointer hoặc metadata trong `AppData/` nếu người dùng cho phép.
- Không tự động chuyển nội dung References thành Knowledge.

### 6.9. AppData và manifest/index
- `AppData/` chỉ lưu metadata tối thiểu để ánh xạ tệp ứng dụng quản lý: file id, type/category, display title, timestamps, version/schema và tags tùy chọn do người dùng đặt.
- Không lưu PII; không lưu toàn văn tài liệu trong manifest nếu không thật sự cần.
- Có thể dựng lại index từ các tệp do ứng dụng quản lý khi cần, nhưng không scan toàn bộ Drive.

### 6.10. Superadmin và quyền riêng tư
- Bảng danh sách tài khoản của Superadmin hiển thị trạng thái cam kết (Đã đồng ý, Cần đồng ý lại hoặc Chưa đồng ý), phiên bản đã đồng ý, `accepted_at` và phiên bản điều khoản hiện tại để phục vụ tuân thủ và quản trị tài khoản. Đây là bằng chứng chỉ để xem; Superadmin không thể chấp nhận thay người dùng.
- Superadmin quản lý username, trạng thái tài khoản, reset, disable và các thiết lập hệ thống.
- Superadmin mặc định không có quyền xem nội dung Documents, Templates/Library, Knowledge hoặc References trên Drive của người dùng; không có backdoor.
- Server TVCI không persist body/content của Documents, Templates, Knowledge hoặc References. Nhóm tác giả và đơn vị phát triển không truy cập nội dung ngoài luồng do người dùng chủ động kích hoạt.
- Không hard-code mật khẩu superadmin. Khởi tạo qua environment/secret và yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.

### 6.11. Chấp nhận điều kiện
- Danh sách Superadmin đối chiếu bản ghi chấp nhận mới nhất với phiên bản hiện hành, hiển thị trạng thái, phiên bản đã đồng ý, `accepted_at` và phiên bản hiện tại; chưa có bản ghi phải hiện Chưa đồng ý và phiên bản cũ phải hiện Cần đồng ý lại.
- Chỉ luồng chấp nhận do chính người dùng khởi tạo mới được ghi nhận chấp nhận. Không có admin API hoặc trường PATCH cho phép tạo hay sửa chấp nhận của người dùng khác.
- Trang Register phải hiển thị tuyên bố và checkbox “Tôi đã đọc, hiểu và chấp nhận”.
- Nút Create Account bị disabled cho đến khi người dùng tích checkbox.
- Lưu `terms_version` và `accepted_at` cho lần chấp nhận.
- Khi điều khoản thay đổi đáng kể, yêu cầu người dùng chấp nhận lại.

### 6.12. Cam kết quyền riêng tư, dữ liệu và điều kiện sử dụng

TVCI Document Platform được thiết kế theo nguyên tắc tôn trọng quyền riêng tư và quyền kiểm soát dữ liệu của người dùng. Ứng dụng không yêu cầu và không chủ động thu thập họ tên, email, số điện thoại, địa chỉ hoặc các thông tin định danh cá nhân khác để tạo tài khoản. Người dùng chỉ cần một tên đăng nhập và mật khẩu; khuyến nghị không sử dụng họ tên thật, email hoặc số điện thoại làm tên đăng nhập.

Nội dung văn bản do người dùng soạn thảo, chỉnh sửa, chuẩn hóa hoặc tạo với sự hỗ trợ của AI không được lưu trên máy chủ của ứng dụng và không được nhóm tác giả hoặc đơn vị phát triển sử dụng cho mục đích khác. Nếu người dùng không kết nối Google Drive, nội dung chỉ tồn tại trong phiên làm việc và người dùng tự lưu bằng cách xuất tệp.

Editor có thể lưu từ/cụm riêng lẻ vào từ điển của tài khoản khi người dùng chủ động chọn “Thêm vào từ điển”. Các term này là tùy chọn cá nhân có thể xóa, không chứa văn bản tài liệu; spell-check thực hiện trên máy người dùng và không gửi nội dung soạn thảo ra ngoài.

Việc kết nối Google Drive là lựa chọn hoàn toàn tự nguyện của người dùng. Nếu người dùng chọn kết nối, Drive có thể dùng để lưu văn bản, Thư viện cá nhân, Tri thức cá nhân và tài liệu tham khảo. Người dùng sở hữu và kiểm soát các tệp này; ứng dụng chỉ truy cập trong phạm vi cần thiết cho thao tác người dùng chủ động yêu cầu. Ứng dụng không quét toàn bộ Google Drive hoặc tự ý đọc, xóa, chia sẻ hay thay đổi quyền tệp. Người dùng có thể ngắt kết nối và thu hồi quyền bất cứ lúc nào.

Nhóm tác giả và đơn vị phát triển cam kết không chủ động xâm nhập, khai thác hoặc sử dụng trái phép dữ liệu cá nhân, nội dung văn bản hoặc dữ liệu Google Drive của người dùng. Mọi cơ chế kỹ thuật phải tuân theo nguyên tắc quyền tối thiểu, dữ liệu tối thiểu và quyền kiểm soát thuộc về người dùng.

Phần mềm hiện đang trong giai đoạn phát triển và hoàn thiện. Các chức năng kiểm tra thể thức, chuẩn hóa và hỗ trợ bằng trí tuệ nhân tạo chỉ nhằm hỗ trợ công việc; người dùng chịu trách nhiệm kiểm tra tính chính xác, nội dung, căn cứ, thẩm quyền và tính phù hợp của văn bản trước khi sử dụng hoặc phát hành chính thức. Nhóm tác giả và đơn vị phát triển không chịu trách nhiệm thay cho người dùng đối với nội dung văn bản hoặc quyết định sử dụng văn bản do người dùng tạo ra.

Mọi ý kiến góp ý, phản hồi lỗi và đề xuất cải tiến đều rất quý báu:

- Đại diện nhóm tác giả: Lương Xuân Hùng
- Zalo/Điện thoại: 0983565139
- Email: luongxuanhung2402@gmail.com

☐ Tôi xác nhận rằng tôi đã đọc, hiểu và chấp nhận Cam kết quyền riêng tư, dữ liệu và Điều kiện sử dụng nêu trên.

### 6.13. Privacy & Data Invariants — bắt buộc cho mọi task sau
- Admin chỉ được xem metadata bằng chứng chấp nhận trong danh sách tài khoản; không được ghi nhận chấp nhận thay người dùng. Việc xem metadata này không mở quyền truy cập nội dung Documents, Templates/Library, Knowledge hoặc References.
- Không feature tự ý thêm PII collection.
- Không feature persist document body/content vào TVCI server/database.
- Spell-check chạy cục bộ; không gửi nội dung tài liệu tới dịch vụ bên ngoài. Chỉ được persist term/cụm người dùng chủ động thêm vào từ điển tài khoản, tuyệt đối không persist đoạn văn hoặc toàn văn.
- Knowledge, Library và References không được persist vào TVCI server/database.
- Không tự động học hoặc ghi nhớ nội dung người dùng nếu chưa có hành động opt-in rõ ràng.
- Không tự động promote nội dung Reference thành Knowledge.
- Các category Drive phải tách biệt về semantics và mục đích sử dụng.
- Drive luôn opt-in, least privilege, disconnectable và do người dùng kiểm soát.
- Admin không được quyền đọc tài liệu hay nội dung Drive cá nhân.
- Mọi tính năng mới liên quan Knowledge, Library hoặc References phải tuân thủ opt-in, least privilege và user control.
- Mọi thay đổi auth/storage/privacy phải update design.md trước hoặc cùng code và có test.
- Nếu yêu cầu tương lai xung đột các invariant này, agent phải dừng và nêu xung đột trước triển khai.

---

## 7. Kiến Trúc Cài Đặt & Vận Hành (Deployment & Runtime)

### 7.1. Standalone Installer (`release/TVCI-Word-Tools-Setup-0.1.1.exe`)
- Đóng gói bằng Inno Setup dạng tự giải nén (SFX).
- **Thư mục cài đặt**: `%LOCALAPPDATA%\TVCIWordTools`.
- **Thành phần đi kèm**:
  - Runtime: Node.js x64 portable độc lập, WebView2 setup.
  - Server: `server.js` xử lý HTTPS và API nội bộ.
  - Scripts: Bộ PowerShell & VBScript quản lý vòng đời (`launcher.vbs`, `setup.ps1`, `stop-host.ps1`, `uninstall.ps1`).
  - App & Templates: Toàn bộ web bundle (`dist/`) và các mẫu chuẩn DOCX (`templates/`).
  - Manifest: File `manifest.xml` khai báo Ribbon và URL localhost.

### 7.2. Cơ chế Watchdog Tự phục hồi (`launcher.vbs`)
```vbs
Do While True
    If FSO.FileExists(StopMarker) Then Exit Do
    ' Kiểm tra nếu server.js bị dừng ngoài ý muốn -> Tự khởi động lại
    WshShell.Run Cmd, 0, True
    WScript.Sleep 2000
Loop
```
- Đảm bảo service host luôn hoạt động ngầm mà không hiển thị cửa sổ console đen gây khó chịu cho người dùng.
- Tự phục hồi ngay lập tức nếu tiến trình server bị ngắt đột ngột.
- Khi người dùng chọn Gỡ cài đặt (Uninstall), hệ thống ghi file `.tvci-stop` để watchdog dừng tuần tự và dọn dẹp tài nguyên.

---

## 8. Quy Trình Kiểm Thử & Đảm Bảo Chất Lượng (QA Discipline)

Tuân thủ nghiêm ngặt **Superpowers Engineering Discipline**:

```
[Brainstorming] -> [Planning] -> [TDD: Red-Green-Refactor] -> [Systematic Debugging] -> [Verification]
```

### Bộ lệnh xác minh bắt buộc trước khi đóng gói:
1. **Kiểm tra kiểu dữ liệu tĩnh (Type Checking)**:
   ```bash
   npm run typecheck
   ```
2. **Kiểm thử đơn vị (Unit Tests - Jest)**:
   ```bash
   npm test
   ```
   *(33 Test Suites, 177 tests bao phủ logic AI, Content Control, Templates, Formatting)*
3. **Kiểm thử tích hợp & Hệ thống (QA Integration Tests)**:
   ```bash
   npm run test:qa
   ```
   *(237 tests kiểm tra toàn diện manifest ribbon, local packaging, regex, DOCX headers)*
4. **Biên dịch bản sản xuất (Production Build)**:
   ```bash
   npm run build
   ```
5. **Xác thực Manifest Office**:
   ```bash
   npm run validate-manifest
   ```
6. **Đóng gói file cài đặt Setup EXE**:
   ```bash
   npm run installer
   ```
   *(Tạo file cài đặt tự động cập nhật mã băm SHA-256 vào release/)*

---

*Tài liệu này là nguồn chân lý thiết kế (Single Source of Truth) cho dự án TVCI Word Add-in.*
