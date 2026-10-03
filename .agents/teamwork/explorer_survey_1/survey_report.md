# BÁO CÁO KHẢO SÁT TOÀN DIỆN CODEBASE TVCI WORD ADD-IN

**Thời gian khảo sát:** 2026-09-29  
**Người thực hiện:** Survey Explorer 1  
**Mục tiêu:** Khảo sát, bóc tách và tài liệu hóa toàn bộ tính năng, quy tắc thể thức, thuật toán, cấu trúc dữ liệu và logic triển khai trong `TVCI_word_addins/src` phục vụ xây dựng Web Application độc lập (`TVCI_web_app`).

---

## 1. TỔNG QUAN KIẾN TRÚC CODEBASE `src/`

Codebase được viết bằng TypeScript (Node.js, React 18, Webpack 5, Jest), thiết kế theo mô hình phân tầng chặt chẽ với các module độc lập nền tảng (Pure TypeScript) và các service tích hợp Office.js.

### Bản đồ cấu trúc thư mục `src/`:
- `src/rules/`: Bộ máy chuẩn hóa & kiểm tra thể thức văn bản hành chính theo Nghị định 30/2020/NĐ-CP, Quy chế văn thư Viện Cơ khí Năng lượng và Mỏ (IEMM), Đảng ủy (05-HD/VPTW) và TKV.
- `src/templates/`: Thư viện biểu mẫu, catalog mẫu biểu chuẩn TVCI/IEMM/Đảng, schemas biểu mẫu, xác thực dữ liệu đầu vào.
- `src/ai/`: Hệ thống trợ lý AI (OpenAI & Gemini), pipeline prompt văn bản hành chính, trích xuất dữ liệu mẫu biểu, soát lỗi chính tả/ngữ pháp và tạo kế hoạch thay đổi (Diff/Apply Plan).
- `src/knowledge/`: Cơ sở tri thức quy định nội bộ và kinh nghiệm nghiệp vụ TVCI, tìm kiếm độ tương đồng (RAG-lite) để tiêm vào ngữ cảnh AI.
- `src/models/`: Cấu hình tài liệu chuẩn (`DocumentSettings`), cầu nối lưu trữ localStorage và Word settings.
- `src/word/`: Tầng dịch vụ giao tiếp Microsoft Word Office.js (Formatting, Content Controls, Page Setup, Tables, Lists, Skeletons, Unicode conversion).
- `src/taskpane/`: Giao diện React hiển thị trong Task Pane của Microsoft Word (Checklist thể thức, Form điền mẫu biểu, Chat AI Workspace, Quản lý kho mẫu).
- `src/commands/`: Entrypoint các nút lệnh Ribbon Office (Kiểm tra 1-click, Soát lỗi an toàn, Smart Draft).
- `src/utils/`: Tiện ích chuẩn hóa ngày tháng, trích yếu, số ký hiệu, dấu câu và làm sạch nội dung hành chính.

---

## 2. CHI TIẾT QUY CHUẨN THỂ THỨC VĂN BẢN (NGHỊ ĐỊNH 30/2020/NĐ-CP & TVCI/IEMM)

Hệ thống mã hóa đầy đủ quy chuẩn thể thức tại `src/rules/component-rules.ts`, `src/rules/profiles.ts`, `src/rules/tvci-default.ts` và `src/utils/tvci-formatter.ts`.

### 2.1 Bảng quy chuẩn chi tiết từng thành phần văn bản hành chính

| Thành phần văn bản | Font chữ | Cỡ chữ (pt) | Kiểu chữ (Style) | Căn lề (Alignment) | Khoảng cách & Giãn dòng | Quy tắc chi tiết & Dấu câu |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Quốc hiệu** (`NATIONAL_EMBLEM`) | Times New Roman | 12 - 13 (target: 12) | In hoa, Đứng, **Đậm** | Giữa (`Centered`) | `spaceBefore: 0`, `spaceAfter: 0`, single/1.2 | Cụm từ: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM`. |
| **Tiêu ngữ** (`MOTTO`) | Times New Roman | 13 - 14 (target: 13) | Chữ thường, Đứng, **Đậm**, viết hoa chữ cái đầu các từ ghép | Giữa (`Centered`) | Ngay dưới Quốc hiệu; `spaceBefore: 0`, `spaceAfter: 0` | `Độc lập - Tự do - Hạnh phúc`. Phía dưới có đường kẻ ngang mảnh dài bằng 1/3 đến 1/2 độ dài dòng chữ. |
| **Cơ quan cấp trên** (`AGENCY_NAME` dòng 1) | Times New Roman | 12 - 13 (target: 12) | In hoa, Đứng, Thường/Nhạt | Giữa (`Centered`) | Ô trái bảng tiêu đề | Ví dụ: `TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM` hoặc `VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN`. |
| **Cơ quan ban hành** (`AGENCY_NAME` dòng 2) | Times New Roman | 12 - 13 (target: 13) | In hoa, Đứng, **Đậm** | Giữa (`Centered`) | Dưới cơ quan cấp trên | Phía dưới có đường kẻ ngang mảnh dài bằng 1/3 đến 1/2 độ dài dòng chữ. Ví dụ: `TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP`. |
| **Số, ký hiệu** (`NUMBER_SYMBOL`) | Times New Roman | 13 | Chữ thường, Đứng, Không đậm | Giữa (`Centered`) | Đặt dưới tên cơ quan ban hành | Mẫu: `Số: 26/TVCI` hoặc `Số: …/VCNM-TTTN`. Có khoảng trống sau `Số:` nếu điền tay. Công văn không dùng chữ tắt `CV`. |
| **Địa danh, ngày tháng** (`PLACE_DATE`) | Times New Roman | 13 - 14 (target: 14) | Chữ thường, **Nghiêng**, Không đậm | Phải (`Right`) | Ngay dưới Tiêu ngữ, cùng hàng với Số/ký hiệu | Mẫu: `Hà Nội, ngày 09 tháng 9 năm 2026`. Quy tắc: Ngày < 10 thêm số `0`; Tháng 1, 2 thêm số `0`; Tháng 3-12 không thêm số `0`. |
| **Tên loại văn bản** (`DOCUMENT_TYPE`) | Times New Roman | 13 - 14 (target: 14) | In hoa, Đứng, **Đậm** | Giữa (`Centered`) | `spaceBefore: 12pt`, `spaceAfter: 4pt` | Ví dụ: `QUYẾT ĐỊNH`, `THÔNG BÁO`, `TỜ TRÌNH`, `BÁO CÁO`. Đứng độc lập ở giữa trang. |
| **Trích yếu văn bản có tên loại** (`ABSTRACT`) | Times New Roman | 13 - 14 (target: 14) | Chữ thường, Đứng, **Đậm** | Giữa (`Centered`) | Đặt ngay dưới Tên loại văn bản; `spaceBefore: 2pt`, `spaceAfter: 12pt` | Mẫu: `Về việc phê duyệt kế hoạch năm 2026`. Phía dưới có đường kẻ ngang mảnh dài từ 1/3 đến 1/2 dòng dài nhất của trích yếu. |
| **Trích yếu công văn** | Times New Roman | 12 - 13 | Chữ thường, Đứng, Không đậm | Giữa / Trái | Đặt dưới cụm Số và ký hiệu văn bản | Bắt đầu bằng `V/v` hoặc `Về việc`. Tuyệt đối không có dấu hai chấm (`:`). Chữ cái đầu tiên viết thường (VD: `V/v triển khai công tác...`). |
| **Căn cứ pháp lý** (`LEGAL_BASIS`) | Times New Roman | 13 | Chữ thường, **Nghiêng**, Không đậm | Đều (`Justified`) / Trái | `firstLineIndent: 10mm`, `spaceBefore: 2pt`, `spaceAfter: 2pt` | Bắt đầu bằng `Căn cứ...`. Mỗi dòng kết thúc bằng dấu chấm phẩy (`;`), dòng căn cứ cuối cùng kết thúc bằng dấu chấm (`.`) (riêng văn bản Đảng kết thúc bằng dấu phẩy `,`). |
| **Kính gửi (1 nơi)** (`ADDRESSEE`) | Times New Roman | 13 - 14 (target: 14) | Chữ thường, Đứng, Không đậm | Trái / Giữa (Công văn) | `spaceBefore: 6pt`, `spaceAfter: 6pt` | Nằm cùng dòng với Kính gửi: `Kính gửi: Tên đơn vị`, không có dấu câu ở cuối dòng. |
| **Kính gửi (từ 2 nơi)** (`ADDRESSEE`) | Times New Roman | 13 - 14 (target: 14) | Chữ thường, Đứng, Không đậm | Trái (`Left`), thụt lề dòng tiếp theo | Dòng `Kính gửi:` đứng riêng; mỗi nơi nhận 1 dòng gạch đầu dòng | Dòng đầu: `Kính gửi:` có dấu hai chấm. Các dòng nơi nhận: `- Đơn vị 1;`, dòng cuối cùng kết thúc bằng dấu chấm: `- Đơn vị 2.`. |
| **Nội dung văn bản** (`body`) | Times New Roman | 13 - 14 (chuẩn TVCI: 13pt) | Chữ thường, Đứng, Không đậm | Căn đều hai bên (`Justified`) | Thụt đầu dòng `10mm - 12.7mm`; `spaceBefore: 0-6pt` (chuẩn 2pt), `spaceAfter: 0-6pt` (chuẩn 2pt); giãn dòng `1.2 - 1.5 lines` (chuẩn `15.6pt`) | Sau dấu chấm phẩy (`;`) trong đoạn phải viết hoa chữ cái đầu. Các ý gạch đầu dòng (`-`) kết thúc bằng `;`, ý cuối kết thúc bằng `.`. Câu kết thúc trân trọng: `Trân trọng cảm ơn./.` |
| **Quyền hạn, chức vụ ký** (`SIGNER_ROLE`) | Times New Roman | 13 - 14 (target: 13/14) | In hoa, Đứng, **Đậm** | Giữa (`Centered`) cột bên phải | Cột phải của khối ký; cách tên người ký 3-4 dòng trống (khoảng 36-48pt) để ký & đóng dấu | Ví dụ: `GIÁM ĐỐC`, `VIỆN TRƯỞNG`, `TM. HỘI ĐỒNG THÀNH VIÊN`, `KT. GIÁM ĐỐC / PHÓ GIÁM ĐỐC`. |
| **Họ tên người ký** (`signer.name`) | Times New Roman | 13 - 14 (target: 13/14) | Chữ hoa hoặc thường, Đứng, **Đậm** | Giữa (`Centered`) cột bên phải | Đặt dưới cùng khối ký | Không ghi học hàm, học vị (GS, TS) trước tên trong văn bản hành chính nhà nước. |
| **Nhãn Nơi nhận** (`RECIPIENTS`) | Times New Roman | 12 | Chữ thường, **Nghiêng**, **Đậm** | Trái (`Left`) | Ô bên trái của khối ký cuối văn bản | Bắt buộc có dấu hai chấm: `Nơi nhận:`. |
| **Chi tiết nơi nhận** (`RECIPIENTS` items) | Times New Roman | 11 | Chữ thường, Đứng, Không đậm | Trái (`Left`) | Thụt dòng hoặc gạch đầu dòng | Mỗi nơi nhận một dòng bắt đầu bằng `- ` và kết thúc bằng dấu chấm phẩy (`;`). Dòng cuối cùng là bản lưu: `Lưu: VT, [đơn vị].` kết thúc bằng dấu chấm (`.`), không ghi số lượng bản lưu (bỏ cụm `, 01 bản`). |
| **Số trang** (`TVCI_PAGE_NUMBER`) | Times New Roman | 13 - 14 | Chữ số Ả-rập, Đứng, Không đậm | Giữa lề trên (`header-center`) theo NĐ30 | Đặt canh giữa theo chiều ngang ở phần lề trên của văn bản | Ẩn số trang ở trang đầu tiên (`hideFirstPage: true`). (Riêng mẫu TKV/IEMM đặt góc phải chân trang `footer-right`; Đảng đặt giữa chân trang `footer-center`). |

### 2.2 Quy chuẩn khổ giấy & lề trang (A4 Page Setup)
Căn cứ Điều 10 và Phụ lục I Nghị định 30/2020/NĐ-CP:
- **Khổ giấy:** A4 tiêu chuẩn ($210 \times 297$ mm), sai số cho phép $\pm 0.5$ mm.
- **Hướng giấy:** Chiều dọc (`Portrait`). (Chiều ngang `Landscape` chỉ dùng cho bảng biểu số liệu đặc thù).
- **Lề trên (Top margin):** $20 - 25$ mm (Target chuẩn hệ thống TVCI: **20 mm** / 56.7 pt).
- **Lề dưới (Bottom margin):** $20 - 25$ mm (Target chuẩn hệ thống TVCI: **20 mm** / 56.7 pt).
- **Lề trái (Left margin):** $30 - 35$ mm (Target chuẩn hệ thống TVCI: **30 mm** / 85.05 pt - dự phòng đóng gáy hồ sơ).
- **Lề phải (Right margin):** $15 - 20$ mm (Target chuẩn hệ thống TVCI: **15 mm** / 42.52 pt).

### 2.3 Quy chuẩn đường kẻ ngang phân tách (`HorizontalRule`)
Quy định tại `src/rules/horizontal-rules.ts`:
- **Đường kẻ dưới Quốc hiệu / Tiêu ngữ:** Đặt dưới `Độc lập - Tự do - Hạnh phúc`, nét liền mảnh ($0.5$ pt), căn giữa, chiều dài bằng $1/3$ đến $1/2$ độ dài dòng chữ.
- **Đường kẻ dưới Tên cơ quan ban hành:** Đặt dưới dòng cơ quan trực tiếp, nét liền mảnh ($0.5$ pt), chiều dài bằng $1/3$ đến $1/2$ tên cơ quan.
- **Đường kẻ dưới Trích yếu nội dung:** Đặt dưới trích yếu của văn bản có tên loại, chiều dài bằng $1/3$ đến $1/2$ dòng dài nhất của phần trích yếu (tỷ lệ target: **0.4** tức 40%).

---

## 3. BỘ MÁY KIỂM TRA THỂ THỨC (AUDITING) & TỰ ĐỘNG SỬA LỖI (AUTO-FIX)

Bộ máy audit thể thức nằm trong `src/rules/`, hoạt động độc lập không phụ thuộc vào UI hay Office API đối với các logic tính toán (Pure Functional Engine).

### 3.1 Cấu trúc dữ liệu & Mô hình thực thể (`models.ts`)
```typescript
export type IssueSeverity = "pass" | "warning" | "error";
export type RuleEvaluationStatus = "PASS" | "FAIL" | "MISSING" | "NOT_APPLICABLE";
export type RuleCategory = "page" | "header" | "symbol_date" | "title" | "recipients" | "body" | "signer";

export interface ParagraphSnapshot {
  id: string;               // e.g. "doc:p:0"
  text: string;
  fontName: string;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  alignment: SupportedAlignment; // "Left" | "Centered" | "Right" | "Justified"
  spaceBefore: number;
  spaceAfter: number;
  firstLineIndentMm?: number;
  lineSpacingPt?: number;
  lineSpacingMultiple?: number;
}

export interface ValidationIssue {
  id: string;
  ruleId: string;           // e.g. "body.fontName", "component.MOTTO.bold"
  targetId: string;         // id của paragraph hoặc "page"
  message: string;          // Lời nhắc người dùng (tiếng Việt)
  severity: IssueSeverity;
  autoFixable: boolean;     // Có thể sửa tự động hay cần can thiệp thủ công
  actual: string | number | boolean;
  expected: string | number | boolean;
  fixValue?: string | number | boolean; // Giá trị đích khi tự động sửa
}

export interface DocumentEvaluationSummary {
  isBlankDocument: boolean;
  totalRules: number;
  applicableRules: number;
  passedRules: number;
  failedRules: number;
  missingRules: number;
  notApplicableRules: number;
  healthScore: number;      // 0 - 100%
  results: RuleEvaluationResult[];
  issues: ValidationIssue[];
}
```

### 3.2 Nhận diện tự động ngữ cảnh & Phân loại thành phần (`auto-detect.service.ts` & `component-classifier.ts`)
1. **Khử dấu tiếng Việt (`removeTones`):** Phục vụ nhận diện từ khóa không phụ thuộc cách gõ Unicode tổ hợp hay dựng sẵn.
2. **Nhận diện cơ quan (Organization Detection):**
   - Chứa `dang bo`, `chi bo`, `- bc/du`, `- qd/du` $\rightarrow$ Đơn vị: `DANG` (Profile: `DANG_05_HD_VPTW_2026`).
   - Chứa `trung tam thu nghiem`, `kiem dinh cong nghiep`, `/tvci` $\rightarrow$ Đơn vị: `TVCI` (Profile: `NĐ30_TVCI`).
   - Chứa `vien co khi nang luong va mo`, `/cknlm` $\rightarrow$ Đơn vị: `IEMM` (Profile: `IEMM`).
   - Chứa `tap doan cong nghiep than`, `vinacomin` $\rightarrow$ Đơn vị: `TKV` (Profile: `TKV`).
3. **Nhận diện loại văn bản (`SPECIFIC_DOC_TITLES`):**
   - So khớp tiêu đề độc lập hoặc cụm từ khóa: `Quyết định`, `Tờ trình`, `Biên bản`, `Thông báo`, `Báo cáo`, `Kế hoạch`, `Giấy giới thiệu`, `Công văn` (`v/v`, `ve viec`).
4. **Phân loại thành phần văn bản (`classifyDocumentComponents`):**
   - Duyệt các đoạn văn bản (paragraph) và gán nhãn:
     * `NATIONAL_EMBLEM`: chứa "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM".
     * `MOTTO`: regex khớp "Độc lập - Tự do - Hạnh phúc".
     * `PARTY_TITLE`: khớp "ĐẢNG CỘNG SẢN VIỆT NAM".
     * `NUMBER_SYMBOL`: regex khớp `^Số\s*:?` và chứa chữ số.
     * `PLACE_DATE`: regex khớp `, ngày ... tháng ... năm ...`.
     * `DOCUMENT_TYPE`: danh sách tập hợp `DOCUMENT_TYPES` in hoa.
     * `ABSTRACT`: đoạn văn ngay sau tên loại văn bản (chiều dài $\le 220$ ký tự, không phải "Điều 1").
     * `LEGAL_BASIS`: bắt đầu bằng `Căn cứ`.
     * `ADDRESSEE`: bắt đầu bằng `Kính gửi:?`.
     * `RECIPIENTS`: bắt đầu bằng `Nơi nhận:?`.
     * `SIGNER_ROLE`: các chức vụ in hoa $\le 80$ ký tự (`GIÁM ĐỐC`, `VIỆN TRƯỞNG`, `CHỦ TỊCH`, `BÍ THƯ`, `TL.`, `KT.`...).

### 3.3 Đánh giá quy tắc & Tính điểm sức khỏe (`document-evaluator.ts`)
Bộ máy duyệt qua 7 nhóm quy tắc với 25+ kiểm tra chi tiết:
1. **Nhóm Trang (`page` - 6 quy tắc):** Khổ giấy A4, hướng giấy dọc, lề trên 20-25mm, lề dưới 20-25mm, lề trái 30-35mm, lề phải 15-20mm.
2. **Nhóm Tiêu đề đầu trang (`header` - 4 quy tắc):** Quốc hiệu, Tiêu ngữ, Tiêu đề Đảng, Tên cơ quan ban hành.
3. **Nhóm Số & Ngày (`symbol_date` - 2 quy tắc):** Số ký hiệu, Địa danh ngày tháng.
4. **Nhóm Tên loại & Trích yếu (`title` - 3 quy tắc):** Tên loại văn bản, Trích yếu nội dung, Đường kẻ trích yếu.
5. **Nhóm Nơi nhận (`recipients` - 2 quy tắc):** Kính gửi (Công văn/Tờ trình), Nơi nhận cuối văn bản.
6. **Nhóm Nội dung (`body` - 8 quy tắc):** Font chữ Times New Roman, Cỡ chữ 13-14pt, Căn lề Justified, Thụt đầu dòng 10-12.7mm, SpaceBefore 0-6pt, SpaceAfter 0-6pt, LineSpacing 1.2-1.5, Căn cứ ban hành.
7. **Nhóm Chữ ký (`signer` - 2 quy tắc):** Chức vụ người ký, Họ tên người ký.

**Công thức tính điểm sức khỏe tài liệu:**
$$\text{Applicable Rules} = \text{Total Rules} - \text{Not Applicable Rules}$$
$$\text{Health Score} = \operatorname{round}\left(\frac{\text{Passed Rules}}{\text{Applicable Rules}} \times 100\right)$$

### 3.4 Cơ chế Sửa lỗi an toàn (Safe Issues & Auto-Correction)
Hệ thống phân định nghiêm ngặt giữa lỗi sửa tự động được (`autoFixable: true`) và lỗi cấu trúc thiếu (`MISSING`):
- **Quy tắc `MISSING`:** Là lỗi thiếu thành phần cấu trúc (VD: thiếu Quốc hiệu, thiếu Nơi nhận, thiếu Chữ ký). Các lỗi này **không có dữ liệu tự động thay thế** an toàn và không bao giờ được đưa vào danh sách Safe Auto-Fix (người dùng phải nhập thông tin hoặc chèn template).
- **Quy tắc `FAIL` sửa an toàn (`safeIssues`):**
  1. *Sửa trang giấy (`applyPageIssueFix`):* Đặt lại khổ giấy A4, hướng Portrait, căn lề chuẩn top=20mm, bottom=20mm, left=30mm, right=15mm.
  2. *Sửa lỗi thể thức đoạn (`applyIssueFix`):* Dùng `issueToPatch` chuyển issue thành `FormattingPatch`:
     - Font $\rightarrow$ `Times New Roman`
     - Size $\rightarrow$ 13pt (hoặc theo target của rule)
     - Alignment $\rightarrow$ `Justified` / `Centered` / `Right`
     - Indent $\rightarrow$ 10mm
     - Spacing $\rightarrow$ `spaceBefore: 2`, `spaceAfter: 2`, `lineSpacingMultiple: 1.2`
  3. *Sửa văn bản & dấu câu (`applyTextIssueFix`):*
     - Bổ sung dấu hai chấm sau `Nơi nhận:` hoặc `Kính gửi:`.
     - Sửa dấu kết thúc căn cứ (các căn cứ trước kết thúc bằng `;`, căn cứ cuối bằng `.`).
     - Chuẩn hóa gạch đầu dòng nơi nhận (`- Đơn vị;`), bỏ cụm `, 01 bản` ở dòng `Lưu: VT.`.
  4. *Khả năng Hoàn tác (Rollback):* Hàm `applyInversePatches` chụp ảnh snapshot đoạn văn trước khi patch để có thể hoàn tác nguyên trạng nếu người dùng không hài lòng.

---

## 4. HỆ THỐNG TRỢ LÝ AI: PROMPTS, SCHEMAS & CƠ CHẾ DIFF PREVIEW

Module AI (`src/ai/`) được thiết kế theo tiêu chí: **Khách quan - Nghiệp vụ - Không bịa đặt - Xem trước rồi mới áp dụng (Preview-First)**.

### 4.1 Kết nối API & Quản lý Nhà cung cấp (OpenAI & Gemini)
- Hỗ trợ 2 nhà cung cấp API độc lập:
  - **OpenAI:** Endpoint `https://api.openai.com/v1/chat/completions`, model mặc định `gpt-4o-mini` (hỗ trợ `gpt-4o`, `o3-mini`).
  - **Google Gemini:** Endpoint `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, model mặc định `gemini-2.0-flash`.
- Cơ chế Resilience mạng:
  - Timeout mặc định: 45 giây (`AI_REQUEST_TIMEOUT_MS = 45_000`).
  - Tự động thử lại lỗi mạng tạm thời (Transient error retry: mã 408, 500, 502, 503, 504) với khoảng lùi lũy thừa `[2000, 5000, 10000]` ms.
  - Xử lý mã 429 Quota/Rate Limit: Đọc header `Retry-After` hoặc parse `QuotaFailure` / `RetryInfo` trong payload JSON của Google, đưa ra thông báo rõ ràng cho người dùng.

### 4.2 Cam kết cốt lõi & Làm sạch văn bản (`ADMINISTRATIVE_AI_RULES`)
Mọi prompt gửi tới mô hình AI đều được đính kèm bản cam kết bất di bất dịch:
```text
1. Văn phong hành chính/công vụ: khách quan, chính xác, rõ nghĩa, ngắn gọn, không sáo rỗng và không quảng cáo.
2. Không được bịa số hiệu, ngày tháng, họ tên, chức danh, cơ quan, địa chỉ, model, serial, tiêu chuẩn, căn cứ pháp lý, mã hồ sơ, số liệu, thời gian, sự kiện hoặc kết luận kỹ thuật.
3. Nếu dữ liệu không có trong nguồn thì trả null hoặc chuỗi rỗng ở structured output; không đoán. Chỉ dùng [cần bổ sung ...] khi người dùng yêu cầu placeholder hiển thị.
4. Mỗi dữ kiện chỉ map một lần. Không sinh lại tên loại, heading, Kính gửi, Nơi nhận, header hoặc block chữ ký đã có trong template.
5. Giá trị field chỉ chứa nội dung của field, không lặp nhãn/heading cố định của template.
6. Nội dung chèn Word phải là plain text: không emoji, Markdown, **, *, ###, _, backtick, code fence hoặc lời dẫn của trợ lý.
```
Hàm `sanitizeAiTextOutput` lọc sạch toàn bộ Markdown markers (`**`, `###`, code blocks), biểu tượng cảm xúc (emojis) và các câu chào/dẫn vô nghĩa của AI ("Dưới đây là nội dung...", "Hy vọng câu trả lời giúp ích cho bạn...").

### 4.3 Ba Phân hệ Trợ lý AI

#### A. Soạn thảo theo ngữ cảnh (Contextual Drafting - `writing-workspace.ts`)
- Cung cấp 7 phong cách viết tùy chọn (`WritingStyleId`):
  1. `administrative`: Hành chính, công vụ, khuôn mẫu văn bản cơ quan.
  2. `formal`: Trang trọng, lịch sự, chuẩn mực.
  3. `concise`: Ngắn gọn, súc tích, trực tiếp.
  4. `clear`: Rõ ràng, mạch lạc, dễ hiểu.
  5. `persuasive`: Thuyết phục, lập luận chặt chẽ.
  6. `neutral`: Trung tính, khách quan, không cảm xúc.
  7. `preserve`: Giữ nguyên cấu trúc và ý nghĩa gốc tối đa, chỉ trau chuốt câu từ.
- **RAG-lite tích hợp tri thức nội bộ (`contextual-pipeline.ts`):** Tự động bóc tách từ khóa từ yêu cầu của người dùng, tìm kiếm vector/từ khóa trong kho tri thức `KnowledgeRecord` và tiêm các quy tắc bắt buộc vào ngữ cảnh prompt trước khi AI sinh câu trả lời.

#### B. Soát lỗi & Trau chuốt câu từ (Proofreading - `proofreading.ts`)
- Yêu cầu AI phân tích và trả về **DUY NHẤT JSON** cấu trúc:
```json
{
  "revisedText": "Nội dung văn bản hoàn chỉnh sau khi đã sửa toàn bộ lỗi",
  "issues": [
    {
      "category": "spelling | grammar | capitalization | punctuation | administrative_style",
      "original": "đoạn văn bản gốc có lỗi",
      "suggestion": "đoạn văn bản đề xuất sửa",
      "explanation": "giải thích ngắn gọn nguyên nhân lỗi",
      "position": 0,
      "context": "ngữ cảnh xung quanh lỗi"
    }
  ]
}
```
- Phân loại lỗi an toàn (`isSafeProofreadingIssue`): Các lỗi thuộc nhóm `spelling` (chính tả), `grammar` (ngữ pháp), `capitalization` (viết hoa/thường) và `punctuation` (dấu câu) được coi là an toàn và có thể áp dụng 1-click thay thế tự động; riêng nhóm `administrative_style` (văn phong) yêu cầu người dùng xác nhận.

#### C. Điền nhanh mẫu biểu (Template Fill - `template-fill.ts`)
- Trích xuất thông tin người dùng cung cấp vào đúng các tag Content Control của biểu mẫu.
- Yêu cầu AI trả về JSON:
```json
{
  "fields": [
    {
      "tag": "TEN_TAG",
      "value": "giá trị trích xuất được hoặc null",
      "confidence": 0.95,
      "source": "câu hoặc đoạn dữ liệu nguồn gốc"
    }
  ]
}
```
- Ngưỡng tin cậy tự động điền: `MIN_AUTO_FILL_CONFIDENCE = 0.8` (80%). Giá trị dưới ngưỡng bắt buộc phải được người dùng rà soát thủ công.

### 4.4 Cơ chế Tạo bản so sánh Diff & Phê duyệt trước (Preview-First Plan - `apply-plan.ts`)
Để đảm bảo an toàn tuyệt đối, hệ thống tạo ra một kế hoạch áp dụng (`TemplateApplyPlan`) trước khi ghi bất kỳ thay đổi nào vào văn bản:
1. **So sánh giá trị trước và sau (`changed`):** Chuẩn hóa văn bản về dạng `comparable` (bỏ dấu tiếng Việt, bỏ khoảng trắng thừa, đưa về chữ thường) để phát hiện sự thay đổi thực chất, tránh cập nhật giả do khoảng trắng.
2. **Các chế độ áp dụng (`TemplateApplyAction`):**
   - `FILL_MISSING`: Chỉ điền vào các trường hiện đang trống, bảo vệ trường đã có dữ liệu.
   - `APPEND`: Ghi nối thêm nội dung mới vào sau nội dung cũ, tự động loại bỏ các dòng bị trùng lặp (`uniqueLines`).
   - `REPLACE`: Ghi đè toàn bộ nội dung mới vào trường.
3. **Giao diện Preview Diff (`AiTaskpaneView.tsx`):** Hiển thị chi tiết từng trường dữ liệu: Nhãn trường, hành động (điền mới/ghi nối/thay thế), trích đoạn nội dung mới và số lượng trường sẽ thay đổi. Người dùng bấm **"Áp dụng kế hoạch"** thì dữ liệu mới được đẩy vào tài liệu.

---

## 5. MÔ HÌNH DỮ LIỆU MẪU BIỂU (TEMPLATES) & THAY THẾ TRƯỜNG ĐỘNG

Module biểu mẫu nằm trong `src/templates/` và `src/word/form-content-control.service.ts`.

### 5.1 Kho mẫu biểu TVCI / IEMM / Đảng (`catalog.ts`)
Hệ thống quản lý 18+ biểu mẫu tiêu chuẩn với metadata chi tiết:
- **Tổ chức (`TemplateOrganization`):** `TVCI`, `IEMM`, `TKV`, `DANG`.
- **Mẫu văn bản chính:**
  - `iemm-cv-001`: Công văn hành chính của Viện.
  - `tvci-cv-001`: Công văn của Trung tâm Thử nghiệm - Kiểm định Công nghiệp (ký hiệu `/VCNM-TTTN`).
  - `iemm-qd-001`: Quyết định cá biệt của Viện (ký hiệu `/QĐ-VCNM`).
  - `iemm-qd-ban-hanh-001`: Quyết định ban hành hoặc phê duyệt văn bản/quy chế.
  - `iemm-tb-001` / `tvci-tb-001`: Thông báo nội bộ / Trung tâm (ký hiệu `/TB-VCNM`).
  - `iemm-tt-001`: Tờ trình của Viện gửi cấp trên (ký hiệu `/TTr-VCNM`).
  - `iemm-to-trinh-noi-bo-001`: Tờ trình của đơn vị gửi Viện.
  - `iemm-bb-001`: Biên bản họp / làm việc của Viện (ký hiệu `/BB-VCNM`).
  - `iemm-thu-moi-001`: Thư mời họp của Viện (ký hiệu `/MH-VCNM`).
  - `iemm-nghi-phep-001`: Đơn xin nghỉ phép của cán bộ công nhân viên.
  - `dang-sample-001`: Văn bản Đảng mẫu (Nghị quyết Chi bộ theo Hướng dẫn 05-HD/VPTW).

### 5.2 Schemas biểu mẫu chuẩn (`form-schema.ts`)
Mỗi loại văn bản có một schema định nghĩa các trường dữ liệu động:
- **Công văn:** `SO_KY_HIEU`, `NGAY_BAN_HANH`, `NOI_NHAN_TRUC_TIEP` (Kính gửi), `TRICH_YEU`, `NOI_DUNG`, `NGUOI_KY`, `NOI_NHAN`.
- **Quyết định:** `SO_KY_HIEU`, `NGAY_BAN_HANH`, `TRICH_YEU`, `CAN_CU` (repeatable), `DIEU_KHOAN` (repeatable), `NGUOI_KY`, `NOI_NHAN`.
- **Thông báo:** `SO_KY_HIEU`, `NGAY_BAN_HANH`, `NOI_DUNG`, `DOI_TUONG_NHAN`, `NGUOI_KY`, `NOI_NHAN`.
- **Tờ trình:** `SO_KY_HIEU`, `NGAY_BAN_HANH`, `KINH_GUI`, `CAN_CU` (repeatable), `LY_DO`, `DE_XUAT_KIEN_NGHI`, `NGUOI_KY`, `NOI_NHAN`.
- **Báo cáo:** `SO_KY_HIEU`, `NGAY_BAN_HANH`, `KINH_GUI`, `KY_BAO_CAO`, `NOI_DUNG`, `KIEN_NGHI`, `NGUOI_KY`, `NOI_NHAN`.
- **Biên bản:** `THOI_GIAN`, `DIA_DIEM`, `THANH_PHAN` (repeatable), `CHU_TRI`, `THU_KY`, `NOI_DUNG_DIEN_BIEN`, `KET_LUAN`, `NGUOI_KY`.
- **Thư mời:** `DOI_TUONG_MOI`, `NOI_DUNG_CUOC_HOP`, `THOI_GIAN`, `DIA_DIEM`, `CHU_TRI`, `CHUAN_BI`, `NGUOI_KY`.
- **Đơn nghỉ phép:** `HO_TEN`, `DON_VI_CONG_VIEC`, `LOAI_NGHI` (select: phép năm, ốm, không lương), `TU_NGAY`, `DEN_NGAY`, `LY_DO`, `NGUOI_DUYET`.

### 5.3 Thuật toán Phân rã Văn bản thô thành Trường Form (`template-matcher.ts`)
Hàm `decomposeDraftIntoFormFields` phân tích văn bản do người dùng dán vào hoặc do AI sinh ra:
1. Nhận diện các tiêu đề mục bằng regex (`SECTION_HEADERS`): `Số:`, `Ngày...`, `V/v...`, `Kính gửi:`, `Căn cứ:`, `Lý do:`, `Đề xuất:`, `Điều 1:`, `Thời gian:`, `Địa điểm:`, `Chủ trì:`, `Thư ký:`, `Người ký:`, `Nơi nhận:`.
2. Bóc tách từng khối dữ liệu tương ứng và gán vào các tag trong schema.
3. Phần nội dung tự sự (narrative) không chứa nhãn cố định được tự động gom vào trường nội dung chính (`NOI_DUNG`, `NOI_DUNG_DIEN_BIEN`, `LY_DO`...).
4. Loại bỏ các nhãn tiêu đề cố định khỏi giá trị trường để tránh lặp nhãn khi chèn vào biểu mẫu.

### 5.4 Cơ chế Điền trường động Hai tầng (Two-Tier Field Replacement)
Triển khai tại `src/word/form-content-control.service.ts`:

1. **Tầng 1 - Content Controls chính quy:**
   - Quét các thẻ `Word.ContentControl` có thuộc tính `tag` khớp với schema.
   - Bảo toàn tiền tố hoặc nhãn có sẵn trong mẫu:
     * `NGAY_BAN_HANH`: Dùng `preserveTemplateLocalityForDate` giữ nguyên địa danh gốc (VD: `Hà Nội, ` hoặc `Cẩm Phả, `).
     * `SO_KY_HIEU`: Dùng `preserveTemplateDocumentNumber` giữ nguyên hậu tố `/VCNM-TTTN`.
     * `TRICH_YEU`: Dùng `preserveTemplateSubjectLabel` giữ nguyên tiền tố `V/v ` hoặc `Về việc `.
     * `KINH_GUI`: Dùng `preserveInlineAddresseeLabel` giữ nhãn `Kính gửi: `.
     * `NOI_NHAN`: Giữ nguyên gạch đầu dòng `- ` và cấu trúc dòng `Lưu: VT.`.

2. **Tầng 2 - Regex Placeholder Fallback (cho các file docx cũ chưa gắn thẻ Content Control):**
   - Nếu mẫu biểu là file DOCX thông thường chưa có thẻ XML, hàm `applyFallbackPlaceholders` quét toàn bộ body paragraphs bằng Regex nhận diện mẫu:
     * Dòng số: `/^Số:\s*(\S*\/.*|\.\.\.|\…|\[KÝ HIỆU\])/i` $\rightarrow$ thay thế bằng số ký hiệu thực tế.
     * Dòng ngày: `/(?:ngày\s+[…\.\d\[\]dm]+|\bngày\s+)\s*tháng.../i` $\rightarrow$ thay bằng ngày tháng chuẩn NĐ30.
     * Dòng trích yếu: `/^(?:V\/v|Về việc:?)\s*(?:[…\.…]|\[.*\])/i` $\rightarrow$ thay bằng trích yếu thực tế.
     * Dòng kính gửi: `/^Kính gửi:?/i` và các dòng gạch đầu dòng chấm lửng `- …;` $\rightarrow$ thay bằng danh sách người nhận.
     * Dòng người ký: `/\[Họ và tên\]|\(Họ và tên\)/i` $\rightarrow$ thay bằng họ tên người ký.
     * Dòng nội dung: `/^\[(?:Nội dung|Nội dung do Trung tâm|Mở đầu:).*\]$/i` $\rightarrow$ thay bằng nội dung thực tế.
   - Sau khi thay thế, tự động bọc đoạn văn bằng Content Control mới (`wrapContentControl`) để các lần sửa sau trở thành Tầng 1.
   - Tự động xóa các đoạn chỉ dẫn soạn thảo còn sót lại trong biểu mẫu (`clearUnusedTemplateBodyInstructions`).

---

## 6. KHUYẾN NGHỊ ÁNH XẠ KIẾN TRÚC SANG `TVCI_web_app`

Để xây dựng ứng dụng Web Application Next.js 14 độc lập đạt chuẩn production, các thành phần từ `TVCI_word_addins/src` được ánh xạ như sau:

| Thành phần trong Add-in (`src/`) | Bản chất thuật toán / logic | Phương án chuyển giao sang `TVCI_web_app` |
| :--- | :--- | :--- |
| `src/rules/component-rules.ts` & `profiles.ts` | Khai báo quy chuẩn font, size, margin, spacing của NĐ30, IEMM, Đảng, TKV | **Tái sử dụng 100%** (Module TypeScript dùng chung cho cả Client & Server). |
| `src/rules/auto-detect.service.ts` & `component-classifier.ts` | Phân loại đoạn văn bản và nhận diện tự động cơ quan, loại văn bản | **Tái sử dụng 100%** (Hoạt động trực tiếp trên mảng chuỗi văn bản của trình soạn thảo Web). |
| `src/rules/document-evaluator.ts`, `validator.ts`, `fixer.ts` | Đánh giá 25+ quy tắc, tính health score, sinh `ValidationIssue` và `FormattingPatch` | **Tái sử dụng 100%** (Chỉ cần map `ParagraphSnapshot` từ Document State của trình soạn thảo). |
| `src/utils/tvci-formatter.ts` & `administrative-body.ts` | Chuẩn hóa ngày tháng, trích yếu, kính gửi, nơi nhận, làm sạch text | **Tái sử dụng 100%** (Tiện ích pure function). |
| `src/templates/form-schema.ts`, `catalog.ts`, `form-validation.ts` | 8 schemas loại văn bản, danh mục mẫu biểu, bộ lọc và xác thực dữ liệu | **Tái sử dụng 100%** (Có thể dùng làm API routes hoặc dynamic forms trong Next.js). |
| `src/ai/direct-client.ts`, `settings.ts` | Kết nối OpenAI / Gemini, retry, backoff, xử lý quota | **Chuyển thành Next.js API Routes** (`/api/ai/chat`, `/api/ai/proofread`) để bảo mật API Key phía server hoặc cho phép nhập trực tiếp ở Client. |
| `src/ai/administrative-rules.ts`, `proofreading.ts`, `template-fill.ts` | System prompts, cam kết không bịa đặt, JSON schemas phân loại lỗi và trích xuất trường | **Tái sử dụng 100%** (Core prompts & JSON parsing logic). |
| `src/ai/apply-plan.ts` | So sánh diff trước/sau, khử trùng dòng lặp, chế độ `FILL_MISSING`/`APPEND`/`REPLACE` | **Tái sử dụng 100%** (Core Diff Engine hiển thị trong Preview modal của Web App). |
| `src/word/formatting.service.ts` & `page-formatting.service.ts` | Các lệnh gọi `Word.run(...)` áp dụng font, size, lề trang | **Thay thế bằng Web Editor API** (TipTap commands / ProseMirror schema / DOCX exporter options). |
| `src/word/content-control.service.ts` & `template.service.ts` | Thẻ Content Control Word & chèn base64 docx | **Thay thế bằng Dynamic Variables / Placeholders** trong Web Editor và thư viện `docx` (Node.js) để build file docx chuẩn khi xuất. |

---

## 7. KẾT LUẬN

Toàn bộ logic nghiệp vụ cốt lõi của bộ công cụ TVCI (quy chuẩn Nghị định 30, thuật toán kiểm tra lỗi thể thức, cơ chế phân loại tự động, hệ thống prompt AI chống bịa đặt, schemas biểu mẫu và thuật toán tạo diff an toàn) đều là mã nguồn TypeScript chất lượng cao, độc lập nền tảng và sẵn sàng để tích hợp trực tiếp vào dự án Web Application độc lập.
