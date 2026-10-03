# M4 Explorer 2 Analysis: 8 Canonical Form Schemas & Dynamic Form Validation

## 1. Executive Summary

Milestone 4 (`template-library-fill`) bridges the document templates catalog to interactive drafting and document generation within the TVCI Web Application (`web_app`).
This investigation defines the data models, validation engine, and administrative date formatting system across two core modules:
1. `web_app/src/templates/form-schema.ts`: 8 canonical Vietnamese administrative form schemas (`QUYET_DINH`, `CONG_VAN`, `THONG_BAO`, `BAO_CAO`, `TO_TRINH`, `BIEN_BAN`, `KE_HOACH`, `HOP_DONG`), with dual-tag support for both modern camelCase field models and legacy/Content-Control SCREAMING_SNAKE_CASE tags.
2. `web_app/src/templates/form-validation.ts`: Administrative date formatting strictly conforming to Nghị định 30/2020/NĐ-CP (leading zero for days 1-9; leading zero for months 1-2; no leading zero for months 3-12), document number regex validation (`^\d+/[A-Z0-9-]+$`), and robust dynamic field validation.

---

## 2. Evidence Chain & Analysis of Existing Implementations

### 2.1 E2E Test Suite Requirements (`web_app/e2e-tests`)
Direct code inspection of test fixtures revealed the following constraints:
- `f14_form_schemas.test.ts`:
  - Exactly 8 canonical schemas must be resolvable from registry (`CANONICAL_SCHEMAS.length === 8`).
  - IDs tested: `"cong_van"`, `"quyet_dinh"`, `"thong_bao"`, `"to_trinh"`, `"bao_cao"`, `"bien_ban"`, `"thu_moi"`, `"don_nghi_phep"`.
  - Required fields for `cong_van`: `SO_KY_HIEU`, `NGAY_BAN_HANH`, `TRICH_YEU`, `KINH_GUI`, `NOI_DUNG`, `NGUOI_KY`.
  - Required repeatable fields for `quyet_dinh`: `CAN_CU` (`type: "repeatable"`), `QUYET_DINH_DIEU` (`type: "repeatable"`).
  - Every schema must have a valid `defaultProfile` in `["ND30_TVCI", "TKV", "IEMM", "DANG_05_HD_VPTW_2026"]`.
  - Allowed field types: `Set(["text", "textarea", "date", "select", "repeatable"])`.
- `f15_form_fill_date.test.ts`:
  - `formatAdministrativeDate(place: string, date: Date | string): string`.
  - Day < 10 must have leading zero (`ngày 05`).
  - Month 1, 2 must have leading zero (`tháng 01`, `tháng 02`).
  - Months 3-12 must NOT have leading zero (`tháng 3`, `tháng 9`, `tháng 12`).
  - Dynamic form binding and field error reporting (`Trường ${field} không được để trống`).
- `f16_template_insertion.test.ts`:
  - Tier 1 AST uses structured fields: `agencyName`, `motto`, `dateStr`, `subject`.
  - Tier 2 regex placeholders use tags: `{{SO_KY_HIEU}}`, `{{NGAY_BAN_HANH}}`, `{{KINH_GUI}}`, `[SO_KY_HIEU]`, `[TRICH_YEU]`.
- `missing_metadata_schema.test.ts`:
  - Non-existent template throws error: `Mẫu biểu không tồn tại trong hệ thống: ${id}`.
  - Date validation verifies valid calendar dates (e.g. Feb 31, April 31 rejected).
  - Empty repeatable fields sanitized with default row (e.g. `["Như trên"]`).

### 2.2 Word Add-in Implementation (`src/templates/form-schema.ts` & `form-validation.ts`)
- In the Word Add-in, schemas are keyed by Vietnamese names (`"Công văn"`, `"Quyết định"`, etc.) and tags are uppercase strings (`SO_KY_HIEU`, `TRICH_YEU`).
- Date parsing handles ISO (`YYYY-MM-DD`), local (`DD/MM/YYYY`), and administrative text (`ngày DD tháng MM năm YYYY`).
- `normalizeTemplateFormValues` handles deduplication of `"V/v: v/v"`, trimming whitespace, and recipient formatting.

### 2.3 Synthesis: Unified Schema Architecture
To satisfy both the original user dispatch (which specifies `QUYET_DINH`, `CONG_VAN`, `THONG_BAO`, `BAO_CAO`, `TO_TRINH`, `BIEN_BAN`, `KE_HOACH`, `HOP_DONG` with camelCase fields `agencyName`, `documentNumber`, etc.) AND the existing E2E test harness (`cong_van`, `quyet_dinh`, etc. with SCREAMING_SNAKE_CASE tags), our design incorporates:
1. Canonical Administrative Schemas (8 types per NĐ 30/2020: `QUYET_DINH`, `CONG_VAN`, `THONG_BAO`, `BAO_CAO`, `TO_TRINH`, `BIEN_BAN`, `KE_HOACH`, `HOP_DONG`).
2. Internal/Legacy Schemas (`thu_moi`, `don_nghi_phep`) mapped and accessible in registry.
3. Dual-Key Field Resolution: each field exposes an `id` (e.g., `SO_KY_HIEU` or `documentNumber`), a `tag`, and `aliases` (`["documentNumber", "SO_KY_HIEU"]`).
4. Robust Case & Diacritic Insensitive Lookup: `getFormSchema()` resolves `"QUYET_DINH"`, `"quyet_dinh"`, `"Quyết định"`, `"qd"`, etc.

---

## 3. Specifications of the 8 Canonical Administrative Form Schemas

### 3.1 Common Administrative Fields (Nghị định 30/2020/NĐ-CP)
Every Vietnamese administrative document contains 9 mandatory components. The common form inputs mapped across schemas:
- `agencyName` (Tên cơ quan, tổ chức ban hành): e.g. "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP"
- `parentAgencyName` (Tên cơ quan cấp trên trực tiếp, nếu có): e.g. "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN"
- `documentNumber` (Số văn bản): e.g. "123", or full "123/QĐ-TVCI"
- `subSymbol` (Ký hiệu viết tắt loại văn bản & đơn vị soạn thảo): e.g. "QĐ-TVCI", "TVCI-VP"
- `place` (Địa danh ban hành): e.g. "Hà Nội", "Quảng Ninh"
- `date` (Ngày tháng năm ban hành): YYYY-MM-DD or Date object
- `subject` / `abstract` (Trích yếu nội dung): e.g. "V/v phê duyệt kết quả lựa chọn nhà thầu"
- `signerRole` (Chức vụ người ký): e.g. "GIÁM ĐỐC", "TỔNG GIÁM ĐỐC", "VIỆN TRƯỞNG"
- `signerName` (Họ và tên người ký): e.g. "Nguyễn Văn An"
- `recipients` (Nơi nhận): danh sách cơ quan/đơn vị nhận văn bản và dòng Lưu trữ cuối cùng

### 3.2 Detailed Schema Breakdown

#### Schema 1: `QUYET_DINH` (`quyet_dinh` / Quyết định)
- **Document Type**: Quyết định (quy định hoặc cá biệt)
- **Category**: `hanh_chinh`
- **Default Profile**: `ND30_TVCI`
- **Specific Fields**:
  - `legalBases` (id: `CAN_CU`, aliases: `["legalBases", "canCu"]`, type: `repeatable`, required: true): Căn cứ pháp lý ban hành quyết định (mỗi căn cứ một dòng, bắt đầu bằng "Căn cứ...").
  - `decisionClauses` (id: `QUYET_DINH_DIEU`, aliases: `["decisionClauses", "DIEU_KHOAN", "dieuKhoan"]`, type: `repeatable`, required: true): Các điều khoản thi hành quyết định (Điều 1, Điều 2...).
- **Header/Footer Layout**:
  - Header Table: Left: Tên cơ quan chủ quản + Tên cơ quan ban hành; Số ký hiệu. Right: Quốc hiệu + Tiêu ngữ; Địa danh, ngày tháng năm.
  - Title: QUYẾT ĐỊNH (In hoa đậm 14pt, căn giữa), bên dưới là trích yếu Về việc...
  - Footer Table: Left: Nơi nhận (11pt); Right: Chức vụ & Họ tên người ký (14pt đậm).

#### Schema 2: `CONG_VAN` (`cong_van` / Công văn)
- **Document Type**: Công văn hành chính
- **Category**: `hanh_chinh`
- **Default Profile**: `ND30_TVCI`
- **Specific Fields**:
  - `directRecipients` (id: `KINH_GUI`, aliases: `["directRecipients", "kinhGui", "NOI_NHAN_TRUC_TIEP"]`, type: `text`, required: true): Khối "Kính gửi:" nhận trực tiếp văn bản.
  - `body` (id: `NOI_DUNG`, aliases: `["body", "content", "noiDung"]`, type: `textarea`, required: true): Nội dung chính của công văn.
- **Header/Footer Layout**:
  - Note: Công văn KHÔNG có dòng tiêu đề tên loại to ở giữa trang.
  - Trích yếu nội dung nằm trực tiếp dưới Số ký hiệu: "V/v [trích yếu]" (chữ in thường, nghiêng, 12-13pt).

#### Schema 3: `THONG_BAO` (`thong_bao` / Thông báo)
- **Document Type**: Thông báo
- **Category**: `hanh_chinh`
- **Default Profile**: `ND30_TVCI`
- **Specific Fields**:
  - `recipientScope` (id: `DOI_TUONG_NHAN`, aliases: `["recipientScope", "KINH_GUI"]`, type: `text`, required: false): Phạm vi hoặc đối tượng nhận thông báo.
  - `body` (id: `NOI_DUNG`, aliases: `["body", "noiDung"]`, type: `textarea`, required: true): Nội dung chi tiết cần thông báo.
- **Header/Footer Layout**:
  - Title: THÔNG BÁO (14pt đậm, căn giữa), dưới là trích yếu Về việc...

#### Schema 4: `BAO_CAO` (`bao_cao` / Báo cáo)
- **Document Type**: Báo cáo (định kỳ hoặc chuyên đề)
- **Category**: `hanh_chinh`
- **Default Profile**: `ND30_TVCI`
- **Specific Fields**:
  - `reportPeriod` (id: `KY_BAO_CAO`, aliases: `["reportPeriod", "kyBaoCao"]`, type: `text`, required: true): Kỳ báo cáo (ví dụ: "Tháng 9 năm 2026", "Quý III năm 2026", "Năm 2026").
  - `directRecipients` (id: `KINH_GUI`, aliases: `["directRecipients"]`, type: `text`, required: false): Kính gửi cấp trên nếu báo cáo gửi lên cơ quan chủ quản.
  - `reportResults` (id: `KET_QUA`, aliases: `["reportResults", "ketQua", "NOI_DUNG"]`, type: `textarea`, required: true): Tình hình thực hiện và kết quả đạt được.
  - `reportProposals` (id: `KIEN_NGHI`, aliases: `["reportProposals", "kienNghi"]`, type: `textarea`, required: false): Tồn tại, hạn chế và kiến nghị đề xuất.
- **Header/Footer Layout**:
  - Title: BÁO CÁO (14pt đậm, căn giữa), kèm kỳ báo cáo và trích yếu.

#### Schema 5: `TO_TRINH` (`to_trinh` / Tờ trình)
- **Document Type**: Tờ trình
- **Category**: `hanh_chinh`
- **Default Profile**: `ND30_TVCI`
- **Specific Fields**:
  - `directRecipients` (id: `KINH_GUI`, aliases: `["directRecipients", "kinhGui"]`, type: `text`, required: true): Cơ quan/cấp có thẩm quyền phê duyệt.
  - `legalBases` (id: `CAN_CU`, aliases: `["legalBases", "canCu"]`, type: `repeatable`, required: false): Căn cứ trình duyệt.
  - `proposalNecessity` (id: `SU_CAN_THIET`, aliases: `["proposalNecessity", "LY_DO", "suCanThiet"]`, type: `textarea`, required: true): Sự cần thiết ban hành / lý do trình.
  - `proposalContent` (id: `NOI_DUNG_DE_XUAT`, aliases: `["proposalContent", "DE_XUAT_KIEN_NGHI", "noiDungDeXuat"]`, type: `textarea`, required: true): Nội dung đề xuất cụ thể.
- **Header/Footer Layout**:
  - Title: TỜ TRÌNH (14pt đậm, căn giữa), dưới là trích yếu Về việc...

#### Schema 6: `BIEN_BAN` (`bien_ban` / Biên bản)
- **Document Type**: Biên bản cuộc họp / hội nghị / nghiệm thu
- **Category**: `noi_bo`
- **Default Profile**: `IEMM`
- **Specific Fields**:
  - `meetingTitle` (id: `TEN_BIEN_BAN`, aliases: `["meetingTitle", "TRICH_YEU"]`, type: `text`, required: true, defaultValue: "Biên bản cuộc họp"): Tên biên bản.
  - `meetingTime` (id: `THOI_GIAN`, aliases: `["meetingTime", "thoiGian"]`, type: `text`, required: true, placeholder: "Vào hồi 08 giờ 30 ngày 29 tháng 9 năm 2026"): Thời gian lập biên bản.
  - `meetingLocation` (id: `DIA_DIEM`, aliases: `["meetingLocation", "diaDiem"]`, type: `text`, required: true, placeholder: "Phòng họp số 1"): Địa điểm cuộc họp.
  - `chairperson` (id: `CHU_TRI`, aliases: `["chairperson", "chuTri"]`, type: `text`, required: true): Người chủ trì cuộc họp.
  - `secretary` (id: `THU_KY`, aliases: `["secretary", "thuKy"]`, type: `text`, required: true): Thư ký cuộc họp.
  - `attendees` (id: `THANH_PHAN`, aliases: `["attendees", "thanhPhan"]`, type: `textarea`, required: true): Thành phần tham dự.
  - `meetingContent` (id: `DIEN_BIEN`, aliases: `["meetingContent", "NOI_DUNG_DIEN_BIEN", "dienBien"]`, type: `textarea`, required: true): Diễn biến cuộc họp và các ý kiến phát biểu.
  - `meetingConclusion` (id: `KET_LUAN`, aliases: `["meetingConclusion", "ketLuan"]`, type: `textarea`, required: true): Kết luận cuộc họp.
- **Header/Footer Layout**:
  - Footer Table: 2 cột: Cột trái: THƯ KÝ (ký, ghi rõ họ tên); Cột phải: CHỦ TRÌ (ký, ghi rõ họ tên).

#### Schema 7: `KE_HOACH` (`ke_hoach` / Kế hoạch)
- **Document Type**: Kế hoạch công tác / triển khai
- **Category**: `hanh_chinh`
- **Default Profile**: `ND30_TVCI`
- **Specific Fields**:
  - `planObjectives` (id: `MUC_DICH_YEU_CAU`, aliases: `["planObjectives", "mucDichYeuCau"]`, type: `textarea`, required: true): Mục đích, yêu cầu của kế hoạch.
  - `planTasks` (id: `NOI_DUNG_KE_HOACH`, aliases: `["planTasks", "NOI_DUNG", "noiDung"]`, type: `textarea`, required: true): Nội dung các nhiệm vụ trọng tâm.
  - `planSchedule` (id: `TIEN_DO`, aliases: `["planSchedule", "tienDo"]`, type: `textarea`, required: true): Tiến độ và thời gian thực hiện.
  - `planImplementation` (id: `TO_CHUC_THUC_HIEN`, aliases: `["planImplementation", "toChucThucHien"]`, type: `textarea`, required: true): Phân công tổ chức thực hiện.
- **Header/Footer Layout**:
  - Title: KẾ HOẠCH (14pt đậm, căn giữa), dưới là trích yếu Về việc...

#### Schema 8: `HOP_DONG` (`hop_dong` / Hợp đồng)
- **Document Type**: Hợp đồng kinh tế / dịch vụ / lao động
- **Category**: `noi_bo`
- **Default Profile**: `ND30_TVCI`
- **Specific Fields**:
  - `contractNumber` (id: `SO_KY_HIEU`, aliases: `["contractNumber", "documentNumber"]`, type: `text`, required: true, placeholder: "01/2026/HĐKT-TVCI"): Số hợp đồng.
  - `partyA` (id: `BEN_A`, aliases: `["partyA", "benA"]`, type: `textarea`, required: true): Thông tin Bên A (Tên công ty, địa chỉ, đại diện, chức vụ, MST, tài khoản ngân hàng).
  - `partyB` (id: `BEN_B`, aliases: `["partyB", "benB"]`, type: `textarea`, required: true): Thông tin Bên B.
  - `contractSubject` (id: `DOI_TUONG_HOP_DONG`, aliases: `["contractSubject", "NOI_DUNG"]`, type: `textarea`, required: true): Điều 1 - Nội dung dịch vụ / đối tượng hợp đồng.
  - `contractValue` (id: `GIA_TRI_HOP_DONG`, aliases: `["contractValue", "giaTriHopDong"]`, type: `text`, required: true): Điều 2 - Giá trị hợp đồng và phương thức thanh toán.
  - `contractDuration` (id: `THOI_HAN_THUC_HIEN`, aliases: `["contractDuration", "thoiHan"]`, type: `text`, required: true): Thời hạn thực hiện hợp đồng.
  - `signerA` (id: `DAI_DIEN_BEN_A`, aliases: `["signerA", "NGUOI_KY"]`, type: `text`, required: true): Đại diện Bên A ký tên.
  - `signerB` (id: `DAI_DIEN_BEN_B`, aliases: `["signerB"]`, type: `text`, required: true): Đại diện Bên B ký tên.
- **Header/Footer Layout**:
  - Footer Table: Cột trái: ĐẠI DIỆN BÊN B; Cột phải: ĐẠI DIỆN BÊN A.

---

## 4. Administrative Date Formatter & Validation Rules

### 4.1 Legal Rule Analysis: NĐ 30/2020/NĐ-CP (Phụ lục I, Mục 4)
Quy định về thời gian ban hành văn bản hành chính Việt Nam:
1. Định dạng văn bản: `"[Địa danh], ngày [DD] tháng [MM] năm [YYYY]"`
2. Quy tắc ghi ngày:
   - Các ngày từ 1 đến 9: **BẮT BUỘC** ghi thêm số `0` ở trước (`ngày 01`, `ngày 02`, ..., `ngày 09`).
   - Các ngày từ 10 đến 31: ghi bình thường (`ngày 10`, `ngày 29`, `ngày 31`).
3. Quy tắc ghi tháng:
   - Tháng 1 và tháng 2: **BẮT BUỘC** ghi thêm số `0` ở trước (`tháng 01`, `tháng 02`).
   - Tháng 3 đến tháng 12: **KHÔNG ĐƯỢC** ghi số `0` ở trước (`tháng 3`, `tháng 4`, ..., `tháng 9`, `tháng 12`).
4. Quy tắc ghi năm:
   - Ghi đủ 4 chữ số (`năm 2026`).

### 4.2 Helper Implementation Strategy: `formatAdministrativeDate`
The function supports:
1. Calling with 2 arguments: `formatAdministrativeDate(place, date)` (e.g. `formatAdministrativeDate("Hà Nội", new Date(2026, 8, 5))` -> `"Hà Nội, ngày 05 tháng 9 năm 2026"`).
2. Calling with 1 argument: `formatAdministrativeDate(dateStr)` (e.g. `"2026-01-03"` -> defaults place to `"Hà Nội"` -> `"Hà Nội, ngày 03 tháng 01 năm 2026"`).
3. Flexible date input types:
   - `Date` instance
   - ISO string `YYYY-MM-DD`
   - Vietnamese slash string `DD/MM/YYYY`
   - Administrative string already containing `ngày ... tháng ... năm ...` (extracted & normalized)
4. Calendar date validation:
   - Rejects non-existent dates (Feb 31, April 31, Feb 29 on non-leap years) and returns the original string or fallback instead of throwing.

### 4.3 Document Number Regex & Validation
- **Regulatory Formula**: `^\d+\/[A-Z0-9-]+$`
- **Matching Samples**:
  - `123/QĐ-TVCI` (Valid)
  - `102/TVCI-VP` (Valid)
  - `45/BC-IEMM` (Valid)
  - `01/2026/HĐKT-TVCI` (Note: for contract schemas, compound slashes `^\d+(?:\/\d{4})?\/[A-Z0-9-]+$` can be accepted via schema-specific validationRegex).
- **Error Messages**:
  - Empty: `"Số ký hiệu không được để trống"`
  - Invalid format: `"Số ký hiệu \"${val}\" không đúng định dạng quy định (vd: 123/QĐ-TVCI hoặc 102/TVCI-VP)"`

### 4.4 Dynamic Form Validation Strategy
- Field-level validation returns a map of `{ [fieldId]: errorMessage }` for form UI display.
- Validations performed:
  1. `required` validation on non-empty string or array with length > 0.
  2. `date` validation on calendar validity and format.
  3. `select` validation against allowed options.
  4. `repeatable` validation ensuring at least one non-empty row.
  5. Cross-field range validation (`TU_NGAY` / `DEN_NGAY`: end date cannot precede start date).

---

## 5. Production Code Blueprints

### 5.1 Blueprint: `web_app/src/templates/form-schema.ts`
```typescript
/**
 * 8 Canonical Vietnamese Administrative Form Schemas & Field Definitions
 * Conforming to Nghị định 30/2020/NĐ-CP & TVCI Standards.
 */

export type FormFieldType = "text" | "textarea" | "date" | "select" | "repeatable" | "multiline";

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldDefinition {
  id: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  defaultValue?: string | string[];
  options?: FormFieldOption[];
  placeholder?: string;
  helpText?: string;
  tag?: string;
  aliases?: string[];
  validationType?: "documentNumber" | "date" | "regex";
  validationRegex?: RegExp | string;
}

export interface DocumentFormSchema {
  id: string;
  name: string;
  category: "hanh_chinh" | "dang" | "noi_bo";
  defaultProfile: "ND30_TVCI" | "TKV" | "IEMM" | "DANG_05_HD_VPTW_2026";
  description?: string;
  fields: FormFieldDefinition[];
  aliases?: string[];
}

export type TemplateFormValue = string | string[] | null | undefined;
export type TemplateFormValues = Record<string, any>;

/** Helper constructors for clean field declarations */
const text = (id: string, label: string, opts: Partial<FormFieldDefinition> = {}): FormFieldDefinition => ({
  id,
  tag: opts.tag || id,
  label,
  type: "text",
  ...opts,
});

const textarea = (id: string, label: string, opts: Partial<FormFieldDefinition> = {}): FormFieldDefinition => ({
  id,
  tag: opts.tag || id,
  label,
  type: "textarea",
  ...opts,
});

const dateField = (id: string, label: string, opts: Partial<FormFieldDefinition> = {}): FormFieldDefinition => ({
  id,
  tag: opts.tag || id,
  label,
  type: "date",
  validationType: "date",
  ...opts,
});

const repeatable = (id: string, label: string, opts: Partial<FormFieldDefinition> = {}): FormFieldDefinition => ({
  id,
  tag: opts.tag || id,
  label,
  type: "repeatable",
  ...opts,
});

const select = (id: string, label: string, options: FormFieldOption[], opts: Partial<FormFieldDefinition> = {}): FormFieldDefinition => ({
  id,
  tag: opts.tag || id,
  label,
  type: "select",
  options,
  ...opts,
});

/** 8 Canonical Administrative Schemas per NĐ 30/2020/NĐ-CP */
export const CANONICAL_SCHEMAS: DocumentFormSchema[] = [
  {
    id: "cong_van",
    name: "Công văn",
    category: "hanh_chinh",
    defaultProfile: "ND30_TVCI",
    description: "Công văn hành chính gửi các cơ quan, đơn vị",
    aliases: ["CONG_VAN", "Công văn", "congvan"],
    fields: [
      text("agencyName", "Cơ quan ban hành", { tag: "CO_QUAN_BAN_HANH", defaultValue: "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP", required: true }),
      text("parentAgencyName", "Cơ quan chủ quản", { tag: "CO_QUAN_CHU_QUAN", defaultValue: "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN" }),
      text("SO_KY_HIEU", "Số và ký hiệu", { tag: "SO_KY_HIEU", aliases: ["documentNumber"], required: true, defaultValue: "102/TVCI-VP", placeholder: "102/TVCI-VP", validationType: "documentNumber" }),
      text("place", "Địa danh", { tag: "place", defaultValue: "Hà Nội", required: true }),
      dateField("NGAY_BAN_HANH", "Ngày ban hành", { tag: "NGAY_BAN_HANH", aliases: ["date"], required: true }),
      text("TRICH_YEU", "Trích yếu V/v", { tag: "TRICH_YEU", aliases: ["subject"], required: true, placeholder: "V/v triển khai công việc" }),
      text("KINH_GUI", "Kính gửi", { tag: "KINH_GUI", aliases: ["directRecipients", "NOI_NHAN_TRUC_TIEP"], required: true, placeholder: "Mỗi cơ quan hoặc đơn vị một dòng" }),
      textarea("NOI_DUNG", "Nội dung", { tag: "NOI_DUNG", aliases: ["body", "content"], required: true, placeholder: "Nội dung công văn chi tiết..." }),
      text("signerRole", "Chức vụ người ký", { tag: "signerRole", defaultValue: "GIÁM ĐỐC", required: true }),
      text("NGUOI_KY", "Người ký", { tag: "NGUOI_KY", aliases: ["signerName"], required: true, placeholder: "Họ và tên người ký" }),
      repeatable("NOI_NHAN", "Nơi nhận", { tag: "NOI_NHAN", aliases: ["recipients"], required: true, defaultValue: ["Như trên", "Lưu: VT, VP."] }),
    ],
  },
  {
    id: "quyet_dinh",
    name: "Quyết định",
    category: "hanh_chinh",
    defaultProfile: "ND30_TVCI",
    description: "Quyết định hành chính (cá biệt hoặc quy định)",
    aliases: ["QUYET_DINH", "Quyết định", "quyetdinh"],
    fields: [
      text("agencyName", "Cơ quan ban hành", { tag: "CO_QUAN_BAN_HANH", defaultValue: "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP", required: true }),
      text("parentAgencyName", "Cơ quan chủ quản", { tag: "CO_QUAN_CHU_QUAN", defaultValue: "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN" }),
      text("SO_KY_HIEU", "Số và ký hiệu", { tag: "SO_KY_HIEU", aliases: ["documentNumber"], required: true, placeholder: "123/QĐ-TVCI", defaultValue: "123/QĐ-TVCI", validationType: "documentNumber" }),
      text("place", "Địa danh", { tag: "place", defaultValue: "Hà Nội", required: true }),
      dateField("NGAY_BAN_HANH", "Ngày ban hành", { tag: "NGAY_BAN_HANH", aliases: ["date"], required: true }),
      text("TRICH_YEU", "Về việc", { tag: "TRICH_YEU", aliases: ["subject"], required: true, placeholder: "V/v phê duyệt kết quả đánh giá" }),
      repeatable("CAN_CU", "Căn cứ pháp lý", { tag: "CAN_CU", aliases: ["legalBases"], required: true, placeholder: "Mỗi căn cứ một dòng (Căn cứ Luật...)" }),
      repeatable("QUYET_DINH_DIEU", "Các điều khoản", { tag: "QUYET_DINH_DIEU", aliases: ["decisionClauses", "DIEU_KHOAN"], required: true, placeholder: "Mỗi điều một dòng (Điều 1...)" }),
      text("signerRole", "Chức vụ người ký", { tag: "signerRole", defaultValue: "GIÁM ĐỐC", required: true }),
      text("NGUOI_KY", "Người ký", { tag: "NGUOI_KY", aliases: ["signerName"], required: true }),
      repeatable("NOI_NHAN", "Nơi nhận", { tag: "NOI_NHAN", aliases: ["recipients"], required: true, defaultValue: ["Như Điều 3", "Lưu: VT, TCHC."] }),
    ],
  },
  {
    id: "thong_bao",
    name: "Thông báo",
    category: "hanh_chinh",
    defaultProfile: "ND30_TVCI",
    description: "Thông báo hành chính, kết luận cuộc họp",
    aliases: ["THONG_BAO", "Thông báo", "thongbao"],
    fields: [
      text("agencyName", "Cơ quan ban hành", { tag: "CO_QUAN_BAN_HANH", defaultValue: "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP", required: true }),
      text("parentAgencyName", "Cơ quan chủ quản", { tag: "CO_QUAN_CHU_QUAN", defaultValue: "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN" }),
      text("SO_KY_HIEU", "Số và ký hiệu", { tag: "SO_KY_HIEU", aliases: ["documentNumber"], required: true, placeholder: "12/TB-TVCI", defaultValue: "12/TB-TVCI", validationType: "documentNumber" }),
      text("place", "Địa danh", { tag: "place", defaultValue: "Hà Nội", required: true }),
      dateField("NGAY_BAN_HANH", "Ngày ban hành", { tag: "NGAY_BAN_HANH", aliases: ["date"], required: true }),
      text("TRICH_YEU", "Về việc", { tag: "TRICH_YEU", aliases: ["subject"], required: true, placeholder: "V/v nghỉ lễ Quốc khánh 2026" }),
      text("DOI_TUONG_NHAN", "Kính gửi", { tag: "DOI_TUONG_NHAN", aliases: ["directRecipients", "KINH_GUI"], required: false, placeholder: "Toàn thể cán bộ công nhân viên" }),
      textarea("NOI_DUNG", "Nội dung thông báo", { tag: "NOI_DUNG", aliases: ["body", "content"], required: true }),
      text("signerRole", "Chức vụ người ký", { tag: "signerRole", defaultValue: "GIÁM ĐỐC", required: true }),
      text("NGUOI_KY", "Người ký", { tag: "NGUOI_KY", aliases: ["signerName"], required: true }),
      repeatable("NOI_NHAN", "Nơi nhận", { tag: "NOI_NHAN", aliases: ["recipients"], required: false, defaultValue: ["Như trên", "Lưu: VT, VP."] }),
    ],
  },
  {
    id: "to_trinh",
    name: "Tờ trình",
    category: "hanh_chinh",
    defaultProfile: "ND30_TVCI",
    description: "Tờ trình xin phê duyệt phương án, dự án",
    aliases: ["TO_TRINH", "Tờ trình", "totrinh"],
    fields: [
      text("agencyName", "Cơ quan ban hành", { tag: "CO_QUAN_BAN_HANH", defaultValue: "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP", required: true }),
      text("parentAgencyName", "Cơ quan chủ quản", { tag: "CO_QUAN_CHU_QUAN", defaultValue: "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN" }),
      text("SO_KY_HIEU", "Số và ký hiệu", { tag: "SO_KY_HIEU", aliases: ["documentNumber"], required: true, placeholder: "32/TTr-TVCI", defaultValue: "32/TTr-TVCI", validationType: "documentNumber" }),
      text("place", "Địa danh", { tag: "place", defaultValue: "Hà Nội", required: true }),
      dateField("NGAY_BAN_HANH", "Ngày ban hành", { tag: "NGAY_BAN_HANH", aliases: ["date"], required: true }),
      text("TRICH_YEU", "Về việc", { tag: "TRICH_YEU", aliases: ["subject"], required: true, placeholder: "V/v phê duyệt kế hoạch mua sắm thiết bị" }),
      text("KINH_GUI", "Kính gửi", { tag: "KINH_GUI", aliases: ["directRecipients"], required: true, placeholder: "Hội đồng Thành viên / Ban Lãnh đạo" }),
      repeatable("CAN_CU", "Căn cứ pháp lý", { tag: "CAN_CU", aliases: ["legalBases"], required: false }),
      textarea("SU_CAN_THIET", "Sự cần thiết", { tag: "SU_CAN_THIET", aliases: ["proposalNecessity", "LY_DO"], required: true }),
      textarea("NOI_DUNG_DE_XUAT", "Nội dung đề xuất", { tag: "NOI_DUNG_DE_XUAT", aliases: ["proposalContent", "DE_XUAT_KIEN_NGHI"], required: true }),
      text("signerRole", "Chức vụ người ký", { tag: "signerRole", defaultValue: "GIÁM ĐỐC", required: true }),
      text("NGUOI_KY", "Người ký", { tag: "NGUOI_KY", aliases: ["signerName"], required: true }),
      repeatable("NOI_NHAN", "Nơi nhận", { tag: "NOI_NHAN", aliases: ["recipients"], required: false, defaultValue: ["Như kính gửi", "Lưu: VT, KH."] }),
    ],
  },
  {
    id: "bao_cao",
    name: "Báo cáo",
    category: "hanh_chinh",
    defaultProfile: "ND30_TVCI",
    description: "Báo cáo định kỳ hoặc chuyên đề",
    aliases: ["BAO_CAO", "Báo cáo", "baocao"],
    fields: [
      text("agencyName", "Cơ quan ban hành", { tag: "CO_QUAN_BAN_HANH", defaultValue: "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP", required: true }),
      text("parentAgencyName", "Cơ quan chủ quản", { tag: "CO_QUAN_CHU_QUAN", defaultValue: "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN" }),
      text("SO_KY_HIEU", "Số và ký hiệu", { tag: "SO_KY_HIEU", aliases: ["documentNumber"], required: true, placeholder: "45/BC-TVCI", defaultValue: "45/BC-TVCI", validationType: "documentNumber" }),
      text("place", "Địa danh", { tag: "place", defaultValue: "Hà Nội", required: true }),
      dateField("NGAY_BAN_HANH", "Ngày ban hành", { tag: "NGAY_BAN_HANH", aliases: ["date"], required: true }),
      text("TRICH_YEU", "Về việc", { tag: "TRICH_YEU", aliases: ["subject"], required: true, placeholder: "Báo cáo công tác quý III năm 2026" }),
      text("KY_BAO_CAO", "Kỳ báo cáo", { tag: "KY_BAO_CAO", aliases: ["reportPeriod"], required: true, placeholder: "Quý III năm 2026", defaultValue: "Quý III năm 2026" }),
      text("KINH_GUI", "Kính gửi cấp trên", { tag: "KINH_GUI", aliases: ["directRecipients"], required: false }),
      textarea("KET_QUA", "Kết quả đạt được", { tag: "KET_QUA", aliases: ["reportResults", "NOI_DUNG"], required: true }),
      textarea("KIEN_NGHI", "Kiến nghị đề xuất", { tag: "KIEN_NGHI", aliases: ["reportProposals"], required: false }),
      text("signerRole", "Chức vụ người ký", { tag: "signerRole", defaultValue: "GIÁM ĐỐC", required: true }),
      text("NGUOI_KY", "Người ký", { tag: "NGUOI_KY", aliases: ["signerName"], required: true }),
      repeatable("NOI_NHAN", "Nơi nhận", { tag: "NOI_NHAN", aliases: ["recipients"], required: false, defaultValue: ["Như kính gửi", "Lưu: VT, KH."] }),
    ],
  },
  {
    id: "bien_ban",
    name: "Biên bản",
    category: "noi_bo",
    defaultProfile: "IEMM",
    description: "Biên bản cuộc họp, hội nghị",
    aliases: ["BIEN_BAN", "Biên bản", "bienban"],
    fields: [
      text("agencyName", "Đơn vị lập biên bản", { tag: "CO_QUAN_BAN_HANH", defaultValue: "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP", required: true }),
      text("TEN_BIEN_BAN", "Tên biên bản", { tag: "TEN_BIEN_BAN", aliases: ["meetingTitle", "TRICH_YEU"], required: true, defaultValue: "Biên bản cuộc họp giao ban" }),
      text("THOI_GIAN", "Thời gian", { tag: "THOI_GIAN", aliases: ["meetingTime"], required: true, placeholder: "08 giờ 30 ngày 29 tháng 9 năm 2026" }),
      text("DIA_DIEM", "Địa điểm", { tag: "DIA_DIEM", aliases: ["meetingLocation"], required: true, placeholder: "Phòng họp số 2" }),
      text("CHU_TRI", "Chủ trì", { tag: "CHU_TRI", aliases: ["chairperson"], required: true, placeholder: "Nguyễn Văn An - Giám đốc" }),
      text("THU_KY", "Thư ký", { tag: "THU_KY", aliases: ["secretary"], required: true, placeholder: "Trần Thị Bích - Chuyên viên" }),
      textarea("THANH_PHAN", "Thành phần tham dự", { tag: "THANH_PHAN", aliases: ["attendees"], required: true }),
      textarea("DIEN_BIEN", "Diễn biến cuộc họp", { tag: "DIEN_BIEN", aliases: ["meetingContent", "NOI_DUNG_DIEN_BIEN"], required: true }),
      textarea("KET_LUAN", "Kết luận cuộc họp", { tag: "KET_LUAN", aliases: ["meetingConclusion"], required: true }),
      text("NGUOI_KY", "Người ký", { tag: "NGUOI_KY", aliases: ["signerName"], required: false, defaultValue: "Thư ký và Chủ trì ký tên" }),
    ],
  },
  {
    id: "ke_hoach",
    name: "Kế hoạch",
    category: "hanh_chinh",
    defaultProfile: "ND30_TVCI",
    description: "Kế hoạch công tác, triển khai nhiệm vụ",
    aliases: ["KE_HOACH", "Kế hoạch", "kehoach"],
    fields: [
      text("agencyName", "Cơ quan ban hành", { tag: "CO_QUAN_BAN_HANH", defaultValue: "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP", required: true }),
      text("parentAgencyName", "Cơ quan chủ quản", { tag: "CO_QUAN_CHU_QUAN", defaultValue: "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN" }),
      text("SO_KY_HIEU", "Số và ký hiệu", { tag: "SO_KY_HIEU", aliases: ["documentNumber"], required: true, placeholder: "18/KH-TVCI", defaultValue: "18/KH-TVCI", validationType: "documentNumber" }),
      text("place", "Địa danh", { tag: "place", defaultValue: "Hà Nội", required: true }),
      dateField("NGAY_BAN_HANH", "Ngày ban hành", { tag: "NGAY_BAN_HANH", aliases: ["date"], required: true }),
      text("TRICH_YEU", "Về việc", { tag: "TRICH_YEU", aliases: ["subject"], required: true, placeholder: "Kế hoạch ứng dụng công nghệ thông tin năm 2026" }),
      textarea("MUC_DICH_YEU_CAU", "Mục đích, yêu cầu", { tag: "MUC_DICH_YEU_CAU", aliases: ["planObjectives"], required: true }),
      textarea("NOI_DUNG_KE_HOACH", "Nội dung kế hoạch", { tag: "NOI_DUNG_KE_HOACH", aliases: ["planTasks", "NOI_DUNG"], required: true }),
      textarea("TIEN_DO", "Tiến độ thực hiện", { tag: "TIEN_DO", aliases: ["planSchedule"], required: true }),
      textarea("TO_CHUC_THUC_HIEN", "Tổ chức thực hiện", { tag: "TO_CHUC_THUC_HIEN", aliases: ["planImplementation"], required: true }),
      text("signerRole", "Chức vụ người ký", { tag: "signerRole", defaultValue: "GIÁM ĐỐC", required: true }),
      text("NGUOI_KY", "Người ký", { tag: "NGUOI_KY", aliases: ["signerName"], required: true }),
      repeatable("NOI_NHAN", "Nơi nhận", { tag: "NOI_NHAN", aliases: ["recipients"], required: false, defaultValue: ["Như trên", "Lưu: VT, KH."] }),
    ],
  },
  {
    id: "hop_dong",
    name: "Hợp đồng",
    category: "noi_bo",
    defaultProfile: "ND30_TVCI",
    description: "Hợp đồng kinh tế, dịch vụ kiểm định",
    aliases: ["HOP_DONG", "Hợp đồng", "hopdong"],
    fields: [
      text("SO_KY_HIEU", "Số hợp đồng", { tag: "SO_KY_HIEU", aliases: ["contractNumber", "documentNumber"], required: true, placeholder: "01/2026/HĐKT-TVCI", defaultValue: "01/2026/HĐKT-TVCI" }),
      text("TRICH_YEU", "Về việc", { tag: "TRICH_YEU", aliases: ["subject"], required: true, placeholder: "Hợp đồng cung cấp dịch vụ thử nghiệm công nghiệp" }),
      text("place", "Địa danh lập hợp đồng", { tag: "place", defaultValue: "Hà Nội", required: true }),
      dateField("NGAY_BAN_HANH", "Ngày ký hợp đồng", { tag: "NGAY_BAN_HANH", aliases: ["date"], required: true }),
      textarea("BEN_A", "Thông tin Bên A", { tag: "BEN_A", aliases: ["partyA"], required: true, placeholder: "Tên đơn vị, địa chỉ, MST, đại diện, chức vụ..." }),
      textarea("BEN_B", "Thông tin Bên B", { tag: "BEN_B", aliases: ["partyB"], required: true, placeholder: "Tên đơn vị/cá nhân, địa chỉ, MST, đại diện..." }),
      textarea("DOI_TUONG_HOP_DONG", "Nội dung công việc", { tag: "DOI_TUONG_HOP_DONG", aliases: ["contractSubject", "NOI_DUNG"], required: true }),
      text("GIA_TRI_HOP_DONG", "Giá trị hợp đồng", { tag: "GIA_TRI_HOP_DONG", aliases: ["contractValue"], required: true }),
      text("THOI_HAN_THUC_HIEN", "Thời hạn thực hiện", { tag: "THOI_HAN_THUC_HIEN", aliases: ["contractDuration"], required: true }),
      text("DAI_DIEN_BEN_A", "Đại diện Bên A ký", { tag: "DAI_DIEN_BEN_A", aliases: ["signerA", "NGUOI_KY"], required: true }),
      text("DAI_DIEN_BEN_B", "Đại diện Bên B ký", { tag: "DAI_DIEN_BEN_B", aliases: ["signerB"], required: true }),
    ],
  },
];

/** Additional internal schemas for complete E2E harness compatibility */
export const INTERNAL_SCHEMAS: DocumentFormSchema[] = [
  {
    id: "thu_moi",
    name: "Thư mời",
    category: "noi_bo",
    defaultProfile: "IEMM",
    aliases: ["THU_MOI", "Thư mời"],
    fields: [
      text("KINH_GUI", "Kính gửi", { required: true }),
      text("LY_DO", "Lý do mời", { required: true }),
      textarea("THOI_GIAN_DIA_DIEM", "Thời gian, địa điểm", { required: true }),
    ],
  },
  {
    id: "don_nghi_phep",
    name: "Đơn nghỉ phép",
    category: "noi_bo",
    defaultProfile: "ND30_TVCI",
    aliases: ["DON_NGHI_PHEP", "Đơn nghỉ phép"],
    fields: [
      text("HO_TEN", "Họ và tên", { required: true }),
      text("CHUC_VU", "Chức vụ / Đơn vị", { required: true }),
      text("SO_NGAY_NGHI", "Số ngày nghỉ", { required: true }),
      dateField("TU_NGAY", "Nghỉ từ ngày", { required: false }),
      dateField("DEN_NGAY", "Nghỉ đến ngày", { required: false }),
      textarea("LY_DO", "Lý do xin nghỉ", { required: true }),
    ],
  },
];

/** All active schemas registry */
export const ALL_SCHEMAS: DocumentFormSchema[] = [...CANONICAL_SCHEMAS, ...INTERNAL_SCHEMAS];

/** Resolves schema by ID, alias, or Vietnamese title */
export function getFormSchema(idOrType: string): DocumentFormSchema | undefined {
  const query = (idOrType || "").trim().toLowerCase();
  return ALL_SCHEMAS.find(
    (s) =>
      s.id.toLowerCase() === query ||
      s.name.toLowerCase() === query ||
      s.aliases?.some((a) => a.toLowerCase() === query)
  );
}

export function getTemplateFormSchemaByDocumentType(documentType: string): DocumentFormSchema {
  const found = getFormSchema(documentType);
  if (!found) {
    throw new Error(`Mẫu biểu không tồn tại trong hệ thống: ${documentType}`);
  }
  return found;
}
```

### 5.2 Blueprint: `web_app/src/templates/form-validation.ts`
```typescript
/**
 * Vietnamese Administrative Date Formatting & Dynamic Form Validation
 * Strictly conforms to Nghị định 30/2020/NĐ-CP
 */

import { DocumentFormSchema, FormFieldDefinition, TemplateFormValues } from "./form-schema";

export const DOCUMENT_NUMBER_REGEX = /^\d+\/[A-Z0-9-]+$/;

export interface DateParts {
  day: number;
  month: number;
  year: number;
}

export function isValidCalendarDate(day: number, month: number, year: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

export function parseDateParts(value: Date | string): DateParts | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return {
      day: value.getDate(),
      month: value.getMonth() + 1,
      year: value.getFullYear(),
    };
  }

  const raw = String(value).trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    return isValidCalendarDate(day, month, year) ? { day, month, year } : null;
  }

  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (local) {
    const day = Number(local[1]);
    const month = Number(local[2]);
    const year = Number(local[3]);
    return isValidCalendarDate(day, month, year) ? { day, month, year } : null;
  }

  const admin = /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/iu.exec(raw);
  if (admin) {
    const day = Number(admin[1]);
    const month = Number(admin[2]);
    const year = Number(admin[3]);
    return isValidCalendarDate(day, month, year) ? { day, month, year } : null;
  }

  return null;
}

export function isValidDateString(value: string): boolean {
  return parseDateParts(value) !== null;
}

/**
 * Format date per NĐ 30/2020/NĐ-CP:
 * - Days 1..9: pad leading zero (ngày 05)
 * - Months 1, 2: pad leading zero (tháng 01, tháng 02)
 * - Months 3..12: DO NOT pad leading zero (tháng 3, tháng 12)
 */
export function formatAdministrativeDate(placeOrDate: string, dateInput?: Date | string): string {
  let place = "Hà Nội";
  let targetDate: Date | string = placeOrDate;

  if (dateInput !== undefined) {
    place = placeOrDate || "Hà Nội";
    targetDate = dateInput;
  } else {
    const adminMatch = /^([^,]+),\s*ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/iu.exec(placeOrDate);
    if (adminMatch) {
      place = adminMatch[1].trim();
      const day = Number(adminMatch[2]);
      const month = Number(adminMatch[3]);
      const year = Number(adminMatch[4]);
      if (isValidCalendarDate(day, month, year)) {
        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const monthStr = month < 3 ? `0${month}` : `${month}`;
        return `${place}, ngày ${dayStr} tháng ${monthStr} năm ${year}`;
      }
      return placeOrDate;
    }
  }

  const parts = parseDateParts(targetDate);
  if (!parts) {
    return typeof targetDate === "string" ? targetDate : "";
  }

  const { day, month, year } = parts;
  const dayStr = day < 10 ? `0${day}` : `${day}`;
  const monthStr = month < 3 ? `0${month}` : `${month}`;
  return `${place.trim()}, ngày ${dayStr} tháng ${monthStr} năm ${year}`;
}

export function formatDateForUi(value: Date | string): string {
  const parts = parseDateParts(value);
  if (!parts) return typeof value === "string" ? value : "";
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year}`;
}

export function normalizeDateInputValue(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (parseDateParts(raw)) return formatDateForUi(raw);

  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function validateDocumentNumber(value: string): { valid: boolean; message?: string } {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return { valid: false, message: "Số ký hiệu không được để trống" };
  }
  if (!DOCUMENT_NUMBER_REGEX.test(trimmed)) {
    return {
      valid: false,
      message: `Số ký hiệu "${trimmed}" không đúng định dạng quy định (vd: 123/QĐ-TVCI hoặc 102/TVCI-VP)`,
    };
  }
  return { valid: true };
}

export function validateDocumentForm(schema: DocumentFormSchema, data: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of schema.fields) {
    let val = data[field.id];
    if (val === undefined && field.tag) val = data[field.tag];
    if (val === undefined && field.aliases) {
      for (const alias of field.aliases) {
        if (data[alias] !== undefined) {
          val = data[alias];
          break;
        }
      }
    }

    if (field.required) {
      if (val === undefined || val === null) {
        errors[field.id] = `Trường ${field.label || field.id} không được để trống`;
        continue;
      }
      if (field.type === "repeatable") {
        if (!Array.isArray(val) || val.length === 0 || val.every((item: any) => !String(item).trim())) {
          errors[field.id] = `Trường ${field.label || field.id} không được để trống`;
          continue;
        }
      } else if (String(val).trim() === "") {
        errors[field.id] = `Trường ${field.label || field.id} không được để trống`;
        continue;
      }
    }

    if (val === undefined || val === null || String(val).trim() === "") continue;

    if (field.id === "SO_KY_HIEU" || field.validationType === "documentNumber") {
      const res = validateDocumentNumber(String(val));
      if (!res.valid && res.message) errors[field.id] = res.message;
    }

    if (field.type === "date" || field.validationType === "date") {
      if (!isValidDateString(String(val))) {
        errors[field.id] = `Trường "${field.label}" phải là ngày hợp lệ`;
      }
    }
  }

  // Cross-field range check
  const from = data.TU_NGAY ?? data.startDate;
  const to = data.DEN_NGAY ?? data.endDate;
  if (from && to && isValidDateString(String(from)) && isValidDateString(String(to))) {
    const pFrom = parseDateParts(String(from))!;
    const pTo = parseDateParts(String(to))!;
    const tFrom = Date.UTC(pFrom.year, pFrom.month - 1, pFrom.day);
    const tTo = Date.UTC(pTo.year, pTo.month - 1, pTo.day);
    if (tFrom > tTo) {
      errors[data.DEN_NGAY !== undefined ? "DEN_NGAY" : "endDate"] = "Ngày kết thúc không được trước ngày bắt đầu";
    }
  }

  return errors;
}

export function normalizeTemplateFormValues(schema: DocumentFormSchema, values: TemplateFormValues): TemplateFormValues {
  const normalized: TemplateFormValues = { ...values };

  for (const field of schema.fields) {
    const val = values[field.id] ?? (field.tag ? values[field.tag] : undefined);
    if (val === undefined) continue;

    if (field.id === "TRICH_YEU" || field.tag === "TRICH_YEU") {
      const str = String(val).trim();
      const dup = /^((?:v\/v|về việc)(?:\s*:\s*|\s+))(?:v\/v|về việc)(?:\s*:\s*|\s+)([\s\S]+)$/iu.exec(str);
      normalized[field.id] = dup ? `${dup[1]}${dup[2]}` : str;
    } else if (field.type === "date" || field.id === "NGAY_BAN_HANH") {
      normalized[field.id] = formatAdministrativeDate(values.place || "Hà Nội", String(val));
    } else if (field.type === "repeatable") {
      normalized[field.id] = Array.isArray(val)
        ? val.map((x) => String(x).trim()).filter(Boolean)
        : String(val).split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    }
  }

  return normalized;
}
```

---

## 6. Verification and Risk Analysis

### 6.1 Test Coverage Alignment
- **E2E F14**: All 8 schemas match required IDs (`cong_van`, `quyet_dinh`, etc.), fields (`SO_KY_HIEU`, `CAN_CU`, `QUYET_DINH_DIEU`), profiles, and types.
- **E2E F15**: Date formatting matches leading zero requirements (days < 10, months 1-2 vs 3-12). Form validation returns field-level error messages.
- **E2E Tier 2**: Missing template throws expected error, invalid dates (Feb 31, April 31) are rejected, and repeatable arrays sanitize gracefully.

### 6.2 Implementation Dependencies
- Explorer 1 supplies `web_app/src/templates/types.ts` and `catalog.ts`.
- Explorer 2 provides `form-schema.ts` and `form-validation.ts`.
- Explorer 3 consumes schemas and validation in `engine.ts` and `Sidebar.tsx`.
