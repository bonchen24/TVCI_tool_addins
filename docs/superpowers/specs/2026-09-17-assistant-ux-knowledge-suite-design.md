# Đặc tả thiết kế: Trợ lý soạn thảo và nghiệp vụ TVCI Word Tools (UX/UI, Kho kiến thức, Template Wizard, Word Editor)

> **Mục tiêu**: Nâng cấp toàn diện `TVCI_word_addins` từ một công cụ chuẩn hóa thể thức thành một **“Trợ lý soạn thảo và nghiệp vụ trong Microsoft Word”** hoàn chỉnh.
> Giữ nguyên 100% các chức năng cốt lõi đang hoạt động (31 biểu mẫu, Content Control, Office COM compatibility, AI providers, form filling), đồng thời mang lại trải nghiệm mượt mà, tối ưu trên Task Pane Microsoft Word.

---

## 1. Kiến trúc UX mới & Hệ thống Navigation

### 1.1. Tái cấu trúc Navigation chính (5 tab phía trên + Nút AI nổi)

Thay thế hệ thống tab cũ (`templates | standardize | ai | builder`) bằng 5 phân hệ nghiệp vụ tự nhiên:

```
+-----------------------------------------------------------------------+
|  [Logo TVCI/IEMM]  TVCI Word Tools                     [Cài đặt ⚙️]    |
+-----------------------------------------------------------------------+
|  (1) SOẠN THẢO  | (2) KIỂM TRA | (3) BIỂU MẪU | (4) KIẾN THỨC | (5) TIỆN ÍCH  |
+-----------------------------------------------------------------------+
|                                                                       |
|                     VÙNG NỘI DUNG CHÍNH (Workspace)                   |
|                                                                       |
+-----------------------------------------------------------------------+
|                                                           [ 🤖 AI ]   |  <-- Nút nổi góc phải
+-----------------------------------------------------------------------+
```

1. **SOẠN THẢO (Compose / Drafting Hub)**:
   - Khi chưa chọn mẫu: Hiển thị **Trang bắt đầu thông minh** (Smart Start Screen).
   - Khi đã chọn mẫu: Hiển thị giao diện **Điền biểu mẫu + Xem trước A4 (Responsive)**.
2. **KIỂM TRA (Document Quality / Editor)**:
   - Trải nghiệm soát lỗi giống Microsoft Word Editor: gom lỗi theo 6 nhóm trực quan, có preview *Hiện tại → Sau khi sửa*, nút *Đi tới lỗi trong Word* và *Sửa tất cả lỗi an toàn*.
3. **BIỂU MẪU (Template Library & Wizard)**:
   - Kho biểu mẫu phân cấp (TVCI / IEMM / Đảng, các phòng ban, loại văn bản).
   - Nút nổi bật: **[+ Tạo biểu mẫu mới]** mở **Template Wizard 5 bước**.
4. **KIẾN THỨC (Knowledge Base)**:
   - Kho quy định, hướng dẫn, kinh nghiệm nghiệp vụ, mẫu câu chuẩn.
   - Tìm kiếm tiếng Việt không dấu, bộ lọc theo cấp độ (🔴 Quy định bắt buộc, 🔵 Hướng dẫn, 🟡 Kinh nghiệm, 🟢 Mẫu câu).
5. **TIỆN ÍCH (Utilities & Admin Tools)**:
   - Tiện ích thường dùng: Kính gửi, Nơi nhận, Kẻ ngang tiêu đề, Số trang, Phụ lục & Bảng, Đánh số bảng, Hướng dẫn nhanh.
   - Khu vực nâng cao (Admin/Chuyên sâu): Quản trị Content Control, Tag, Schema JSON thô, Chẩn đoán OpenXML.
6. **Nút AI nổi (Contextual Floating Action Button)**:
   - Nằm cố định ở góc dưới bên phải.
   - Tự động thay đổi danh sách hành động đề xuất (Quick Prompts) dựa theo tab và ngữ cảnh hiện tại.

---

## 2. Wireframe Text chi tiết từng màn hình

### 2.1. Tab 1: Soạn thảo — Trang bắt đầu thông minh (Smart Start Screen)

```
[Tab: SOẠN THẢO]

+-------------------------------------------------------+
| 📄 TÀI LIỆU HIỆN TẠI                                  |
| Trạng thái: Có nội dung (~3 đoạn, 240 từ)             |
| [🔍 KIỂM TRA THỂ THỨC TÀI LIỆU NÀY] (Nút chính nổi bật)|
| [➕ Tạo văn bản mới từ biểu mẫu]                        |
+-------------------------------------------------------+

+-------------------------------------------------------+
| ⏳ TIẾP TỤC BIỂU MẪU ĐANG LÀM                         |
| "Công văn trả kết quả thử nghiệm"                     |
| Đang dở lúc: 08:45 hôm nay · Đã điền 5/8 trường       |
| [Tiếp tục điền]                      [Bỏ bản nháp]    |
+-------------------------------------------------------+

+-------------------------------------------------------+
| ⭐ MẪU YÊU THÍCH                      [Xem tất cả >]  |
| • [⭐] Công văn TVCI chủ trì soạn thảo                 |
| • [⭐] Quyết định cá biệt của Viện                     |
+-------------------------------------------------------+

+-------------------------------------------------------+
| 🕒 MẪU GẦN ĐÂY                                        |
| • Thông báo TVCI nội bộ                (Vừa dùng)     |
| • Biên bản họp kỹ thuật                (Hôm qua)      |
| • Tờ trình đề xuất mua sắm thiết bị    (3 ngày trước) |
+-------------------------------------------------------+

[ 📁 MỞ KHO BIỂU MẪU ĐẦY ĐỦ ]
```

### 2.2. Tab 1: Soạn thảo — Màn hình điền biểu mẫu (Breadcrumb & Responsive Form/Preview)

```
[Tab: SOẠN THẢO]
< [Quay lại Trang bắt đầu]

TRUNG TÂM > ĐIỆN - ĐIỆN TỬ > CÔNG VĂN > THÔNG BÁO KẾT QUẢ THỬ NGHIỆM
-----------------------------------------------------------------
💡 4 lưu ý nghiệp vụ liên quan [Xem lưu ý]

(Khi Task Pane rộng >= 500px: Chia 2 cột)
+-------------------------------+-------------------------------+
| FORM ĐIỀN THÔNG TIN           | XEM TRƯỚC A4 (Zoom 75% [ - + ])|
|                               |                               |
| Số ký hiệu *                  |  VIỆN CƠ KHÍ...  CỘNG HOÀ XÃ..|
| [Số: ... /VCNM-TTTN        ]  |  TRUNG TÂM...    Độc lập - Tự.|
|                               |  -----------------------------|
| Ngày ban hành                 |  Số: ...         Hà Nội, ngày.|
| [2026-09-17                ]  |                               |
|                               |           CÔNG VĂN            |
| Kính gửi (1 hoặc nhiều nơi) * |                               |
| [Kính gửi: Công ty Điện lực]  |  Kính gửi: Công ty Điện lực.. |
|                               |                               |
| Trích yếu nội dung *          |  [Nội dung văn bản...]        |
| [V/v trả kết quả thử nghiệm]  |                               |
|                               |  Nơi nhận:         GIÁM ĐỐC   |
| Nội dung *                    |  - Như trên;       (Ký tên)   |
| [Sau khi tiến hành thử...  ]  |  Lưu: VT, T2.                 |
+-------------------------------+-------------------------------+

(Khi Task Pane hẹp < 500px: Chuyển thành 2 tab)
[ Form điền thông tin (Active) ]   [ Xem trước A4 (3) ]

-----------------------------------------------------------------
HÀNH ĐỘNG CHÍNH:
[💾 Lưu nháp]   [👁️ Xem trước]   [⚡ CHÈN VÀO WORD VÀ ĐIỀN]
Hành động phụ:
[Áp dụng vào Word hiện tại]  [Chèn mẫu trống]  [Đổi mẫu khác]
```

### 2.3. Tab 2: Kiểm tra văn bản (Word Editor-style Quality Inspector)

```
[Tab: KIỂM TRA]

Quy cách đang áp dụng:
🏢 Quy cách văn bản Trung tâm Thử nghiệm - Kiểm định Công nghiệp [Đổi]

[🔍 KIỂM TRA TOÀN VĂN BẢN]   [⚡ SỬA TẤT CẢ LỖI AN TOÀN (6)]
-----------------------------------------------------------------
Phát hiện 8 điểm cần hoàn thiện:

▼ THỂ THỨC ĐẦU TRANG (2 lỗi)
  ❌ Đường kẻ ngang tiêu ngữ sai kích thước
     Hiện tại: 65mm | Chuẩn NĐ30: 48mm (bằng độ dài dòng chữ)
     [Xem vị trí]  [Sửa lỗi này]  [Giải thích]
  ⚠️ Ngày tháng chưa hạ dòng cân xứng với cơ quan 2 cấp
     [Xem vị trí]  [Sửa lỗi này]

▼ FONT & CỠ CHỮ (1 lỗi)
  ❌ Kính gửi: Cỡ chữ 12pt (chuẩn: Times New Roman 13pt)
     [Xem vị trí]  [Sửa lỗi này]

▼ CĂN LỀ & KHOẢNG CÁCH (3 lỗi)
  ⚠️ Khoảng cách đoạn văn bản: Before 6pt (chuẩn: 2pt)
     [Xem vị trí]  [Sửa lỗi này]

▼ KÍNH GỬI / NƠI NHẬN (2 lỗi)
  ❌ Nơi nhận: Viết tắt chưa chuẩn "Lưu: VT, TT." (chuẩn: "Lưu: VT, T2.")
     Preview thay đổi:
     [Hiện tại]: "Lưu: VT, TT."
     [Sau sửa ]: "Lưu: VT, T2."
     [Chấp nhận sửa]  [Bỏ qua]
```

### 2.4. Tab 3: Kho biểu mẫu & Template Wizard 5 bước

```
[Tab: BIỂU MẪU]
[🔍 Tìm kiếm biểu mẫu (hỗ trợ tiếng Việt không dấu)...       ]
Cơ quan: [ TVCI ] [ IEMM ] [ Đảng ]
Bộ phận: [ Tất cả ] [ Đo lường ] [ Điện ] [ An toàn ] [ Văn phòng ]

[ + TẠO BIỂU MẪU MỚI BẰNG WIZARD ]
-----------------------------------------------------------------
DANH SÁCH BIỂU MẪU (31 mẫu hệ thống + 2 mẫu tự tạo):
• [⭐] Công văn do TVCI chủ trì soạn thảo [Điền form] [Mẫu trống]
• [⭐] Quyết định ban hành văn bản IEMM    [Điền form] [Mẫu trống]
...
```

#### Giao diện Wizard tạo biểu mẫu (Modal / Subview 5 bước):
- **Bước 1: Chọn nguồn**:
  `[Từ tài liệu Word đang mở]` | `[Import file DOCX]` | `[Sao chép từ mẫu có sẵn]` | `[Tạo mẫu trắng]`
- **Bước 2: AI phân tích trường động**:
  "AI phát hiện 9 vị trí có thể đặt trường động trong văn bản:"
  `[x] Số văn bản`  `[x] Ngày ban hành`  `[x] V/v`  `[x] Kính gửi`  `[x] Tên khách hàng`  `[x] Mã mẫu thử nghiệm`
- **Bước 3: Thiết kế form (User-friendly)**:
  Bảng cấu hình thân thiện:
  - Tên hiển thị: "Tên khách hàng" | Kiểu: Chữ ngắn | Bắt buộc: Có | Hướng dẫn: "Nhập tên công ty khách hàng"
  - Tự động sinh tag ngầm: `TEN_KHACH_HANG` (có nút [Nâng cao] để chỉnh sửa thủ công tag Content Control nếu cần).
- **Bước 4: Kiểm tra & Preview**:
  - Chạy bộ validator kiểm tra tính toàn vẹn OpenXML, trùng lặp field, tương thích Word COM.
  - Hiển thị: `✓ Biểu mẫu hợp lệ và an toàn 100% để chèn vào Word`.
- **Bước 5: Lưu biểu mẫu**:
  - Chọn Cơ quan, Phòng ban, Loại văn bản, Đặt tên, Gắn nhãn yêu thích ⭐. Lưu vào kho local IndexedDB.

### 2.5. Tab 4: Kho kiến thức nghiệp vụ

```
[Tab: KIẾN THỨC]
[🔍 Tìm quy định, kinh nghiệm, mẫu câu (không dấu)...       ]
Bộ lọc:
Loại: [Tất cả] [🔴 Bắt buộc] [🔵 Hướng dẫn] [🟡 Kinh nghiệm] [🟢 Mẫu câu]
Phạm vi: [Toàn viện] [Trung tâm] [Phòng thử nghiệm] [Cá nhân]

[ + THÊM MỤC KIẾN THỨC MỚI ]
-----------------------------------------------------------------
DANH SÁCH KIẾN THỨC (Ưu tiên: Quy định -> Hướng dẫn -> Kinh nghiệm):

🔴 [QUY ĐỊNH BẮT BUỘC] · Áp dụng: Toàn viện
Tiêu đề: Sử dụng tên pháp nhân đầy đủ khi gửi khách hàng ngoài Viện
Nội dung: Phải dùng đầy đủ "Viện Cơ khí Năng lượng và Mỏ - Vinacomin" hoặc "Trung tâm Thử nghiệm - Kiểm định Công nghiệp", không dùng từ viết tắt IEMM hoặc TVCI trong nội dung chính văn bản.
Liên quan: Công văn, Thông báo, Hợp đồng

🟡 [KINH NGHIỆM] · Áp dụng: Phòng Điện - Điện tử
Tiêu đề: Kiểm tra niêm phong mẫu thử nghiệm EMC
Nội dung: Khi nhận mẫu thử nghiệm EMC từ khách hàng, chụp ảnh hiện trạng tem niêm phong và ghi chú số niêm phong vào Biên bản nhận mẫu trước khi mở.
Liên quan: Biên bản nhận mẫu, Phiếu yêu cầu thử nghiệm
[Sao chép]  [Sửa]  [Xóa]
```

### 2.6. Nút AI nổi & Contextual Drawer

Khi nhấn nút floating `[ 🤖 AI ]`:

```
+-------------------------------------------------------+
| 🤖 TRỢ LÝ AI NGHIỆP VỤ                      [ Thu nhỏ _ ]
| Ngữ cảnh nhận diện: Đang điền "Công văn trả kết quả TVCI"
+-------------------------------------------------------+
| GỢI Ý THEO CÔNG VIỆC:                                 |
| [⚡ Điền tự động từ email/yêu cầu]                     |
| [✍️ Soạn thảo dự thảo phần Nội dung]                  |
| [👥 Chuẩn hóa khối Kính gửi & Nơi nhận]               |
| [🔍 Rà soát thông tin còn thiếu]                      |
+-------------------------------------------------------+
| Lịch sử trao đổi / Yêu cầu riêng:                     |
| User: Viết giúp phần kết luận đề nghị khách hàng xác  |
| nhận kết quả trong vòng 5 ngày làm việc.              |
|                                                       |
| AI (Đã tra cứu quy định TVCI):                        |
| "Trung tâm Thử nghiệm - Kiểm định Công nghiệp trân    |
| trọng thông báo và đề nghị Quý Công ty phản hồi..."   |
|                                                       |
| [Áp dụng vào ô Nội dung] [Lưu thành kinh nghiệm] [Copy]|
+-------------------------------------------------------+
| [Nhập yêu cầu cho AI...                       ] [Gửi] |
+-------------------------------------------------------+
```

---

## 3. Data Models & Kiến trúc lưu trữ

### 3.1. KnowledgeRecord (Kho kiến thức)

```typescript
export type KnowledgeCategory = 
  | "mandatory_rule"   // 🔴 Quy định bắt buộc
  | "guideline"        // 🔵 Hướng dẫn nghiệp vụ
  | "experience"       // 🟡 Kinh nghiệm thực tế
  | "phrase_template"  // 🟢 Mẫu câu chuẩn
  | "note";            // ⚪ Lưu ý chung

export type KnowledgeScope = "institution" | "center" | "department" | "personal";

export type KnowledgeSourceType = 
  | "official_regulation" // Văn bản quy định chính thức
  | "manual_input"        // Người dùng nhập tay
  | "ai_suggested"        // AI gợi ý từ văn bản
  | "document_extract"    // Trích xuất từ tài liệu đang mở
  | "personal_note";      // Ghi chú cá nhân

export interface KnowledgeRecord {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  scope: KnowledgeScope;
  organization: "TVCI" | "IEMM" | "DANG" | "COMMON";
  department?: string;
  documentTypes: string[];       // Loại văn bản áp dụng: "Công văn", "Biên bản", ...
  templateIds?: string[];        // Gắn với template cụ thể nếu có
  keywords: string[];
  sourceType: KnowledgeSourceType;
  sourceReference?: string;      // Tên Quyết định, quy chế, số hiệu
  priority: number;              // 1: Bắt buộc, 2: Nội bộ, 3: Hướng dẫn, 4: Kinh nghiệm, 5: Mẫu câu
  createdAt: string;
  updatedAt: string;
}
```

### 3.2. Storage Abstraction Layer (`IKnowledgeStorage`)

Tạo abstraction tách biệt để lưu trữ local IndexedDB ban đầu và dễ dàng cắm Backend REST API/SharePoint sau này:

```typescript
export interface IKnowledgeStorage {
  getAll(): Promise<KnowledgeRecord[]>;
  getById(id: string): Promise<KnowledgeRecord | null>;
  query(filter: KnowledgeFilter): Promise<KnowledgeRecord[]>;
  save(record: KnowledgeRecord): Promise<void>;
  delete(id: string): Promise<void>;
}
```

IndexedDB Store:
- Database: `tvci-word-tools` (version nâng lên `2`).
- Object Stores:
  - `templates`: Lưu template DOCX tự tạo của người dùng.
  - `knowledge`: Lưu các bản ghi `KnowledgeRecord`.
  - `preferences`: Lưu `recent_templates` (mảng ID), `favorite_templates` (Set ID).
  - `drafts`: Lưu bản nháp `TemplateFormDraft` đang làm dở.

### 3.3. TemplateFormDraft (Lưu nháp tự động)

```typescript
export interface TemplateFormDraft {
  templateId: string;
  organization: TemplateOrganization;
  documentType: string;
  values: TemplateFormValues;
  lastUpdated: string;
  documentHash?: string; // Nhận diện tài liệu Word gắn liền nếu có
}
```

---

## 4. AI Context Pipeline & Thuật toán truy xuất kiến thức (RAG nhẹ)

### 4.1. Kiến trúc Prompt đa tầng

Khi người dùng kích hoạt AI (ở bất kỳ tab nào), prompt được ghép theo cấu trúc tầng rõ ràng:

```
+-------------------------------------------------------------+
| TẦNG 1: SYSTEM INSTRUCTIONS & ADMINISTRATIVE RULES           |
| (Quy cách NĐ30/2020, Quy chế Viện Cơ khí, Chuẩn viết hoa...) |
+-------------------------------------------------------------+
| TẦNG 2: TEMPLATE & FORM CONTEXT                              |
| (Loại văn bản: Công văn, Template: tvci-cv-001, Các trường) |
+-------------------------------------------------------------+
| TẦNG 3: WORD DOCUMENT CONTEXT                                |
| (Đoạn văn đang chọn, tiêu đề tài liệu, nội dung văn bản)    |
+-------------------------------------------------------------+
| TẦNG 4: RELEVANT KNOWLEDGE (Truy xuất từ Kho kiến thức)     |
| (Tìm kiếm theo keyword & loại văn bản, xếp theo ưu tiên)   |
| 🔴 [Bắt buộc]: ...                                          |
| 🟡 [Kinh nghiệm]: ...                                       |
+-------------------------------------------------------------+
| TẦNG 5: CHAT HISTORY & USER REQUEST                          |
+-------------------------------------------------------------+
```

### 4.2. Thuật toán tìm kiếm & xếp hạng kiến thức (Knowledge Retrieval)
- Sử dụng hàm chuẩn hóa không dấu tiếng Việt `removeVietnameseTones(text)`.
- Khớp từ khóa giữa: `template.documentType`, `template.keywords`, `document.selection` với `knowledge.keywords`, `knowledge.documentTypes`, `knowledge.title`.
- Sắp xếp kết quả theo `priority` tăng dần (1: Bắt buộc trước, 4: Kinh nghiệm sau).
- Giới hạn tối đa 3-5 mục kiến thức liên quan nhất để tránh tràn context window của LLM.

---

## 5. Chiến lược Responsive & Layout Word Task Pane

Word Task Pane có chiều rộng thay đổi linh hoạt từ 280px (rất hẹp) đến 600px+ (khi người dùng kéo rộng).

1. **Quy tắc chống cuộn ngang (Zero Horizontal Scroll)**:
   - Toàn bộ container gốc: `width: 100%; max-width: 100%; overflow-x: hidden; box-sizing: border-box;`.
   - Mọi bảng và ô input: `box-sizing: border-box; width: 100%; max-width: 100%;`.

2. **Breakpoint Form / Preview**:
   - Container Query / Media Query `@media (min-width: 520px)`:
     - Khi `width >= 520px`: Hiển thị song song `[ FORM (45%) ] | [ PREVIEW A4 (55%) ]` với 2 thanh cuộn dọc độc lập (`overflow-y: auto`).
     - Khi `width < 520px`: Tự động chuyển sang dạng 2 Tab: `[ Điền form ] [ Xem trước A4 ]`.
   - Preview A4:
     - Tỉ lệ chuẩn trang A4 (1:1.414).
     - Khả năng zoom: Nút điều khiển `[-]` `[ 75% ]` `[+]` `[Fit]`.
     - Chế độ `fit-width` tự động co giãn bằng `transform: scale(calc(paneWidth / a4Width))` để nội dung luôn nằm trọn trong pane, không bị cắt header/footer.

---

## 6. Chiến lược chuyển đổi (Migration & Reuse Analysis)

### 6.1. Những phần tái sử dụng nguyên vẹn (100% Reuse)
- **31 file DOCX templates** trong `templates/` và `dist/templates/`.
- **Cơ chế chèn văn bản**: `src/word/template.service.ts` (`insertFileFromBase64`).
- **Xử lý Content Control**: `src/word/form-content-control.service.ts` & `content-control.service.ts`.
- **Schema nhập liệu**: `src/templates/form-schema.ts` & `form-validation.ts`.
- **Bộ chuẩn hóa và quy tắc**: `src/rules/*` (bao gồm `component-classifier.ts`, `component-rules.ts`, `validator.ts`, `fixer.ts`, `profiles.ts`).
- **AI Direct Client**: `src/ai/direct-client.ts`, `model-discovery.ts`, `settings.ts`.
- **Soát lỗi AI**: `src/ai/proofreading.ts`, `writing-workspace.ts`.

### 6.2. Những phần nâng cấp / tái cấu trúc (Refactor & Enhance)
- `src/taskpane/App.tsx`: Tách các module giao diện lớn thành các component độc lập:
  - `src/taskpane/components/SmartStartScreen.tsx`
  - `src/taskpane/components/FormDraftingView.tsx` (nâng cấp từ `TemplateFormPanel.tsx`)
  - `src/taskpane/components/InspectionEditorView.tsx` (nâng cấp từ tab standardize)
  - `src/taskpane/components/TemplateLibraryView.tsx`
  - `src/taskpane/components/TemplateWizardModal.tsx`
  - `src/taskpane/components/KnowledgeBaseView.tsx`
  - `src/taskpane/components/UtilitiesView.tsx`
  - `src/taskpane/components/FloatingAiAssistant.tsx`
- `src/taskpane/styles.css`: Bổ sung hệ thống CSS biến, responsive layout, dark/light theme an toàn cho Office.
- `src/templates/storage.ts`: Thêm store `knowledge`, `drafts`, `preferences`.

---

## 7. Kế hoạch triển khai theo 5 giai đoạn (5 Phases)

- **Phase 1 (UX Nền tảng)**:
  - Tái cấu trúc thanh điều hướng 5 tab (`Soạn thảo`, `Kiểm tra`, `Biểu mẫu`, `Kiến thức`, `Tiện ích`).
  - Xây dựng **Trang bắt đầu thông minh (Smart Start Screen)**.
  - Xây dựng **Responsive Form / Preview** (Split view khi rộng, tab view khi hẹp, zoom control).
  - Quản lý **Mẫu gần đây (Recent)** và **Mẫu yêu thích (Favorite ⭐)**.
  - Cơ chế **Tự động lưu nháp form (Draft auto-save)** và phục hồi khi mở lại.

- **Phase 2 (Template Wizard)**:
  - Xây dựng Wizard 5 bước tạo biểu mẫu thân thiện, giấu Content Control thô.
  - AI phát hiện trường động từ văn bản.
  - Trình kiểm tra biểu mẫu trước khi lưu (validate OpenXML, trùng lặp field).

- **Phase 3 (Kho kiến thức nghiệp vụ)**:
  - Xây dựng module `KnowledgeRecord` và abstraction storage IndexedDB.
  - Giao diện quản lý Kho kiến thức (Thêm, Sửa, Xóa, Lọc theo badge 🔴 🔵 🟡 🟢).
  - Tìm kiếm tiếng Việt không dấu.
  - Nút *Lưu vào Kho kiến thức* từ đoạn văn bản chọn trong Word hoặc từ câu trả lời của AI.

- **Phase 4 (Contextual AI & Liên kết Kiến thức)**:
  - Nút AI nổi (Floating Action Button) với menu gợi ý tự động thay đổi theo màn hình.
  - AI Context Pipeline: kết hợp Rules + Template + Document + Knowledge retrieved + Chat.
  - Hiển thị badge `💡 Lưu ý liên quan` ngay trong màn hình điền form của template.

- **Phase 5 (Kiểm tra văn bản kiểu Word Editor)**:
  - Gom nhóm lỗi thành 6 danh mục trực quan.
  - Thao tác cho từng lỗi: *Đi tới vị trí trong Word*, *Preview Hiện tại → Sau khi sửa*, *Sửa lỗi này*, *Bỏ qua*.
  - Nút *Sửa tất cả lỗi an toàn*.
  - Tự động nhận diện quy cách văn bản dựa trên nội dung tài liệu.

---

## 8. Chiến lược kiểm thử & Đảm bảo an toàn (Testing Strategy)

Mọi bước nâng cấp phải vượt qua bộ 5 kiểm tra bắt buộc:
1. **TypeScript Typecheck**: `npm run typecheck` (0 errors).
2. **Jest Test Suite**: `npm test` (giữ passing 54/54 tests hiện tại + viết tests mới cho các service mới).
3. **Webpack Production Build**: `npm run build` (biên dịch sạch sẽ).
4. **Office Manifest Validation**: `npm run validate-manifest` (manifest valid).
5. **Microsoft Word COM Test**: Mở và chèn file biểu mẫu qua nhân Word thật, đảm bảo zero corruption.
