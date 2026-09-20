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

---

## 6. Kiến Trúc Cài Đặt & Vận Hành (Deployment & Runtime)

### 6.1. Standalone Installer (`release/TVCI-Word-Tools-Setup-0.1.1.exe`)
- Đóng gói bằng Inno Setup dạng tự giải nén (SFX).
- **Thư mục cài đặt**: `%LOCALAPPDATA%\TVCIWordTools`.
- **Thành phần đi kèm**:
  - Runtime: Node.js x64 portable độc lập, WebView2 setup.
  - Server: `server.js` xử lý HTTPS và API nội bộ.
  - Scripts: Bộ PowerShell & VBScript quản lý vòng đời (`launcher.vbs`, `setup.ps1`, `stop-host.ps1`, `uninstall.ps1`).
  - App & Templates: Toàn bộ web bundle (`dist/`) và các mẫu chuẩn DOCX (`templates/`).
  - Manifest: File `manifest.xml` khai báo Ribbon và URL localhost.

### 6.2. Cơ chế Watchdog Tự phục hồi (`launcher.vbs`)
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

## 7. Quy Trình Kiểm Thử & Đảm Bảo Chất Lượng (QA Discipline)

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
