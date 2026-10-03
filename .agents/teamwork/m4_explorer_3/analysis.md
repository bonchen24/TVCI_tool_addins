# Phân Tích Kỹ Thuật & Thiết Kế Kiến Trúc: Template Engine, Sidebar UI & Unit Test Suites (Milestone 4)

**Mã tác vụ:** Milestone 4 — `template-library-fill`  
**Tác nhân thực hiện:** M4 Explorer 3  
**Phạm vi mục tiêu:**
1. Template Engine (`web_app/src/templates/engine.ts`): Kiến trúc 2 tầng (Tier 1 Full AST Insertion & Tier 2 Dynamic Field Fill), cơ chế Fallback Regex & Sanitization.
2. Sidebar Template Tab UI (`web_app/src/components/layout/Sidebar.tsx`): Bộ lọc danh mục, ô tìm kiếm tiếng Việt không dấu, danh sách thẻ mẫu biểu, form động theo schema, date picker chuẩn NĐ 30, nút áp dụng biểu mẫu.
3. Thiết kế 4 bộ kiểm thử đơn vị (`web_app/tests/unit/`):
   - `template-catalog.test.ts`: Kiểm thử 22 mẫu biểu, phân loại, tìm kiếm.
   - `form-schema.test.ts`: Kiểm thử 8 schema, kiểu trường, định dạng ngày tháng NĐ 30, kiểm tra lỗi.
   - `template-engine.test.ts`: Kiểm thử sinh tài liệu AST, cập nhật trường, thay thế placeholder, tính hợp lệ Tiptap JSON.
   - `template-ui.test.tsx`: Kiểm thử giao diện thanh bên, bộ lọc, tương tác form động, callback chèn mẫu.

---

## 1. Khảo Sát Hiện Trạng Codebase

### 1.1 Cấu Trúc AST & Extension Hiện Tại của Tiptap (`web_app/src/editor/`)
- **`schema.ts` (`defaultDocumentState`)**:
  - Bảng tiêu đề hành chính 2 cột: `type: 'table'`, `attrs.tableType: 'admin-header'`, `columnRatio: '40-60'`, `isBorderless: true`.
    - Ô trái (`header-left`, `colwidth: [250]`): Cơ quan chủ quản (12pt), Cơ quan ban hành (12pt đậm), `adminRule` loại `AGENCY` (40%), Số ký hiệu (13pt, e.g. `Số: 125/VCNM-TTTN`), Trích yếu nếu là công văn (12pt nghiêng).
    - Ô phải (`header-right`, `colwidth: [374]`): `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM` (12pt đậm), `Độc lập - Tự do - Hạnh phúc` (13pt đậm), `adminRule` loại `MOTTO` (95%), Địa danh & ngày tháng (13pt nghiêng, e.g. `Hà Nội, ngày 09 tháng 9 năm 2026`).
  - Đoạn văn thân bài (`AdministrativeParagraph`): Font Times New Roman, cỡ 13pt hoặc 14pt, giãn dòng `lineSpacing: 1.2` - `1.3`, căn đều `justify`, thụt đầu dòng `firstLineIndentMm: 10` hoặc `12.7`.
  - Bảng chân trang 2 cột: `type: 'table'`, `attrs.tableType: 'admin-footer'`, `columnRatio: '50-50'`, `isBorderless: true`.
    - Ô trái (`footer-recipients`, `colwidth: [312]`): Tiêu đề `Nơi nhận:` (12pt nghiêng đậm), các dòng nơi nhận (11pt, e.g. `- Như trên;`, `- Lưu: VT, ...`).
    - Ô phải (`footer-signer`, `colwidth: [312]`): Chức vụ người ký (13pt đậm, e.g. `KT. VIỆN TRƯỞNG`, `PHÓ VIỆN TRƯỞNG`), 2-3 đoạn trống làm khoảng cách chữ ký, Họ và tên người ký (13pt đậm).

### 1.2 Tiêu Chuẩn NĐ 30/2020/NĐ-CP về Ngày Tháng & Thể Thức
- **Quy tắc ngày tháng hành chính**:
  - Ngày từ 1 đến 9: Bắt buộc đệm số 0 phía trước (`ngày 01`, `ngày 05`, `ngày 09`).
  - Tháng 1 và 2: Bắt buộc đệm số 0 phía trước (`tháng 01`, `tháng 02`).
  - Tháng 3 đến 12: **Không** đệm số 0 (`tháng 3`, `tháng 9`, `tháng 12`).
  - Cấu trúc đầy đủ: `[Địa danh], ngày [DD] tháng [MM] năm [YYYY]`.

### 1.3 Hiện Trạng Sidebar Hiện Tại (`web_app/src/components/layout/Sidebar.tsx`)
- Tab `audit` đã được triển khai đầy đủ với danh sách phát hiện, điểm chuẩn, nút "Sửa an toàn".
- Tab `templates` (dòng 290-314): Hiện tại chỉ là placeholder tĩnh hiển thị 2 thẻ cứng ("Công văn hành chính", "Quyết định ban hành"), chưa có ô tìm kiếm, chưa có bộ lọc danh mục, chưa có form nhập dữ liệu theo schema và chưa kết nối với Tiptap editor.

---

## 2. Thiết Kế Template Engine (`web_app/src/templates/engine.ts`)

Template Engine cung cấp cơ chế tiêm mẫu 2 tầng (2-tier template injection) và xử lý lỗi mềm dẻo.

```
                    ┌───────────────────────────────────────────────┐
                    │            User Interaction / Form            │
                    └───────────────────────┬───────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
          [ Tier 1: Full Replace ]                      [ Tier 2: Dynamic Fill ]
    renderTemplateToEditor(templateId, vals)     applyTemplateFieldsToEditor(ed, vals)
                     │                                             │
      ┌──────────────┴──────────────┐               ┌──────────────┴──────────────┐
      │  Tạo Tiptap JSON AST chuẩn: │               │ 1. Structural Node Walk:    │
      │  - Bảng Header 2 cột (40-60)│               │    Header Symbol / Date,    │
      │  - Khối Tiêu đề / Trích yếu │               │    Addressee, Footer Signer │
      │  - Các đoạn Body theo Schema│               │ 2. Regex Fallback:          │
      │  - Bảng Footer 2 cột (50-50)│               │    {{TAG}} & [TAG] replace  │
      └──────────────┬──────────────┘               └──────────────┬──────────────┘
                     │                                             │
                     ▼                                             ▼
            editor.commands.setContent()                    editor.view.dispatch(tr)
```

### 2.1 Chi Tiết Hợp Đồng Dữ Liệu (Interface Contracts)
```typescript
import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';

export interface TemplateEngineResult {
  success: boolean;
  document?: JSONContent;
  error?: string;
  appliedFieldCount?: number;
}

export interface DynamicFillReport {
  updatedFields: string[];
  replacedPlaceholders: number;
  unfilledPlaceholders: string[];
}
```

### 2.2 Tier 1: Khởi Tạo / Thay Thế Toàn Bộ Tài Liệu (Full Document Generation)
Hàm `renderTemplateToEditor(templateId: string, values: Record<string, any>): JSONContent`:
1. **Header Table (admin-header, 40-60)**:
   - Cột trái:
     - Cơ quan cấp trên (12pt, căn giữa): `values.parentAgencyName || values.CO_QUAN_CHU_QUAN || 'TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM'`.
     - Cơ quan ban hành (12pt in hoa đậm, căn giữa): `values.agencyName || values.TEN_CO_QUAN || 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP'`.
     - Đường kẻ cơ quan: `adminRule` kind `AGENCY` width 40%.
     - Số hiệu (13pt, căn giữa): `Số: ${values.SO_KY_HIEU || values.documentNumber || '.../TVCI'}`.
     - Nếu văn bản là Công văn: Đoạn trích yếu (12pt nghiêng, căn giữa) `V/v ${values.TRICH_YEU || '...'}`.
   - Cột phải:
     - Quốc hiệu: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM` (12pt in hoa đậm, căn giữa).
     - Tiêu ngữ: `Độc lập - Tự do - Hạnh phúc` (13pt chữ thường đậm, căn giữa).
     - Đường kẻ tiêu ngữ: `adminRule` kind `MOTTO` width 95%.
     - Địa danh & Ngày tháng: `formatAdministrativeDate(values.place || 'Hà Nội', values.NGAY_BAN_HANH || values.date)` (13pt nghiêng, căn giữa).
2. **Khối Tiêu Đề Văn Bản & Trích Yếu (Áp dụng cho văn bản có tên loại: Quyết định, Thông báo, Tờ trình, Báo cáo, Biên bản, Thư mời, Đơn nghỉ phép)**:
   - Tên loại văn bản: In hoa đứng đậm, cỡ 14pt, căn giữa (e.g. `QUYẾT ĐỊNH`, `THÔNG BÁO`, `TỜ TRÌNH`).
   - Trích yếu / Về việc: Chữ thường đứng đậm, cỡ 13pt, căn giữa (e.g. `Về việc ban hành quy chế an toàn lao động`).
   - Đường kẻ phân cách trích yếu: `adminRule` kind `ABSTRACT` width 30%.
3. **Khối Thân Bài (Body Sections)**:
   - Định dạng chuẩn NĐ 30: Times New Roman, cỡ 13pt, khoảng cách đoạn trước/sau 2-4pt, giãn dòng 1.2, căn đều (justify), thụt lề đầu dòng 10mm.
   - Phân rã theo từng loại văn bản:
     - **Công văn**: Đoạn `Kính gửi: ${values.KINH_GUI || '...'}` (đậm đầu dòng), các đoạn văn nội dung được tách từ `values.NOI_DUNG`.
     - **Quyết định**: Đoạn thẩm quyền ban hành, các đoạn Căn cứ pháp lý (`values.CAN_CU` - in nghiêng, kết thúc bằng chấm phẩy), từ khóa `QUYẾT ĐỊNH:` (đậm, căn giữa), các Điều khoản (`values.QUYET_DINH_DIEU` hoặc `values.DIEU_KHOAN` - Điều 1, Điều 2...).
     - **Tờ trình**: Kính gửi, Sự cần thiết (`values.SU_CAN_THIET`), Nội dung đề xuất (`values.NOI_DUNG_DE_XUAT`).
     - **Báo cáo**: Kỳ báo cáo, Kết quả đạt được (`values.KET_QUA`), Kiến nghị (`values.KIEN_NGHI`).
     - **Biên bản**: Thời gian, địa điểm, thành phần tham dự, diễn biến, kết luận.
     - **Đơn nghỉ phép**: Kính gửi, Họ và tên, chức vụ đơn vị, lý do xin nghỉ, thời gian nghỉ từ ngày đến ngày.
4. **Footer Table (admin-footer, 50-50)**:
   - Cột trái:
     - Dòng `Nơi nhận:` (12pt nghiêng đậm).
     - Danh sách nơi nhận: Cỡ 11pt, căn trái, không thụt dòng, giãn dòng 1.15. E.g. `- Như Điều 3;`, `- Lưu: VT, ...`.
   - Cột phải:
     - Chức vụ người ký: In hoa đậm, cỡ 13pt, căn giữa (e.g. `GIÁM ĐỐC`, `KT. VIỆN TRƯỞNG / PHÓ VIỆN TRƯỞNG`).
     - 3 đoạn trống giữ khoảng cách cho chữ ký số / ký tay (cỡ 13pt).
     - Họ và tên người ký: In hoa/chữ thường đậm, cỡ 13pt, căn giữa (e.g. `Nguyễn Văn A`).

### 2.3 Tier 2: Điền Trường Động (Dynamic Field Fill)
Hàm `applyTemplateFieldsToEditor(editor: Editor, values: Record<string, any>): DynamicFillReport`:
- Mục tiêu: Giữ nguyên các đoạn văn bản thân bài người dùng đã sửa đổi thủ công, chỉ cập nhật chính xác các trường tương ứng.
- **Chiến lược 1 — Duyệt cây AST (Structural Node Traversal)**:
  - Sử dụng `editor.state.doc.descendants((node, pos) => ...)`:
  - Nếu node nằm trong `header-left`: tìm đoạn chứa `Số:` -> cập nhật số hiệu mới mà không xóa bảng tiêu đề.
  - Nếu node nằm trong `header-right`: tìm đoạn chứa định dạng `ngày ... tháng ... năm ...` -> cập nhật địa danh & ngày tháng chuẩn.
  - Nếu node là đoạn `Kính gửi:` -> cập nhật nội dung cơ quan nhận.
  - Nếu node nằm trong `footer-signer`: cập nhật chức vụ và họ tên người ký.
  - Nếu node nằm trong `footer-recipients`: cập nhật các dòng nơi nhận.
- **Chiến lược 2 — Thay thế Fallback bằng Biểu Thức Chính Quy (Regex Placeholder Replacement)**:
  - Quét qua toàn bộ text nodes trong document để tìm các tag mẫu:
    - Cú pháp `{{TAG}}`: `{{SO_KY_HIEU}}`, `{{NGAY_BAN_HANH}}`, `{{TRICH_YEU}}`, `{{KINH_GUI}}`, `{{NGUOI_KY}}`, `{{CHUC_VU}}`.
    - Cú pháp `[TAG]`: `[SO_KY_HIEU]`, `[TRICH_YEU]`, `[KINH_GUI]`, `[NGUOI_KY]`.
  - Thay thế tag bằng giá trị tương ứng từ `values`.
  - **Quy tắc an toàn**: Nếu tag chưa có giá trị trong `values`, giữ nguyên tag đó (unfilled placeholder retention), không để lại khoảng trắng rỗng hoặc gây crash.
  - Dispatch transaction ProseMirror an toàn (`tr = editor.state.tr; editor.view.dispatch(tr)`).

### 2.4 Xử Lý Dữ Liệu Nhiều Dòng (Multi-line Sanitization) & Xử Lý Lỗi
- **Hàm `sanitizeMultilineInput(input: string | string[] | undefined | null): string[]`**:
  - Chuyển đổi dữ liệu từ textarea hoặc danh sách chuỗi thành mảng các đoạn văn bản.
  - Tách theo `\r?\n`, loại bỏ khoảng trắng thừa đầu/cuối mỗi dòng (`trim()`).
  - Lọc bỏ dòng hoàn toàn rỗng để tránh sinh ra các thẻ `<p></p>` vô nghĩa làm hỏng tỷ lệ trang in A4.
- **Xử lý ngoại lệ**:
  - Nếu `templateId` không tồn tại trong danh mục: fallback an toàn về mẫu công văn mặc định (`tvci-cv`) và ghi nhận cảnh báo thay vì làm ứng dụng ngừng hoạt động.
  - Đảm bảo JSONContent trả về luôn có cấu trúc gốc: `{ type: 'doc', content: [...] }`.

---

## 3. Thiết Kế Giao Diện Sidebar Template Tab UI (`Sidebar.tsx`)

Sidebar tab `templates` được nâng cấp từ placeholder tĩnh thành trình quản trị và điền mẫu biểu hoàn chỉnh.

### 3.1 Cấu Trúc Trạng Thái (Component State)
```typescript
interface TemplateTabState {
  searchQuery: string;
  selectedCategory: string; // 'all' | 'cong_van' | 'quyet_dinh' | 'thong_bao' | 'to_trinh' | 'bieu_mau_noi_bo'
  selectedOrganization: string; // 'all' | 'TVCI' | 'IEMM' | 'TKV' | 'DANG'
  selectedTemplateId: string | null;
  formValues: Record<string, any>;
  isApplying: boolean;
  feedback: {
    type: 'success' | 'error';
    message: string;
  } | null;
  mode: 'insert' | 'fill'; // 'insert' (Tier 1) | 'fill' (Tier 2)
}
```

### 3.2 Giao Diện Duyệt Danh Mục (Template Catalog View)
Khi `selectedTemplateId === null`:
1. **Thanh tìm kiếm (Search Bar)**:
   - Input kèm biểu tượng `Search` (Lucide), nút xóa nhanh (Clear).
   - Tìm kiếm thời gian thực (live search) hỗ trợ tiếng Việt có dấu/không dấu (`normalizeVietnamese`).
2. **Thanh lọc danh mục (Category Filter Pills)**:
   - Các nút pill cuộn ngang: `Tất cả`, `Công văn`, `Quyết định`, `Thông báo`, `Tờ trình`, `Biểu mẫu nội bộ`.
   - Có thể chuyển đổi bộ lọc cơ quan (`TVCI`, `IEMM`, `TKV`, `DANG`).
3. **Danh sách thẻ mẫu (Template Cards List)**:
   - Hiển thị 22 mẫu biểu dưới dạng thẻ tương tác (Cards).
   - Mỗi thẻ gồm:
     - Tên mẫu biểu (in đậm, cỡ 13px, ví dụ: "Công văn TVCI chuẩn", "Quyết định cá biệt").
     - Huy hiệu cơ quan (`TVCI` màu xanh dương indigo, `IEMM` màu tím, `TKV` màu hổ phách, `DANG` màu đỏ rose).
     - Huy hiệu loại văn bản.
     - Mô tả tóm tắt mẫu.
     - Nút "Chọn mẫu" hoặc click trực tiếp vào thẻ.
   - Trạng thái trống (Empty State): Hiển thị thông báo "Không tìm thấy biểu mẫu phù hợp" khi từ khóa tìm kiếm không khớp.

### 3.3 Giao Diện Điền Dữ Liệu Biểu Mẫu (Dynamic Form View)
Khi `selectedTemplateId !== null`:
1. **Thanh điều hướng trên (Navigation Bar)**:
   - Nút "← Danh sách mẫu" để quay lại trình duyệt catalog.
   - Tiêu đề mẫu biểu được chọn cùng huy hiệu thể thức tương ứng.
2. **Các trường nhập liệu động (Dynamic Form Inputs)**:
   - Render tự động dựa trên schema của mẫu biểu:
     - **Text Field**: Input text tiêu chuẩn (Số ký hiệu, Kính gửi, Họ tên người ký, Chức vụ).
     - **Administrative Date Block**:
       - Ô nhập địa danh (mặc định: `Hà Nội`).
       - Ô chọn ngày (HTML5 `type="date"` hoặc chọn ngày/tháng/năm).
       - Khung xem trước trực tiếp (Live Preview Badge): Hiển thị chuỗi ngày tháng hành chính theo đúng NĐ 30:
         *Ví dụ:* `Hà Nội, ngày 05 tháng 02 năm 2026` hoặc `Hà Nội, ngày 29 tháng 9 năm 2026`.
     - **Textarea Field**: Textarea có `rows={4}` cho Nội dung, Lý do, Sự cần thiết.
     - **Select Field**: Dropdown cho các lựa chọn cố định (ví dụ: Loại nghỉ phép).
     - **Repeatable Field**: Khung danh sách động cho Căn cứ pháp lý, Các điều khoản, Nơi nhận:
       - Mỗi dòng kèm nút xóa (biểu tượng `Trash2`).
       - Nút "+ Thêm dòng mới" (biểu tượng `Plus`).
3. **Khối Thao Tác Chính (Action Controls)**:
   - Nút chính **"Áp dụng biểu mẫu"** (Primary Action Button, màu Emerald `#10B981`): Chèn / thay thế toàn bộ tài liệu theo Tier 1.
   - Nút phụ **"Cập nhật trường dữ liệu"** (Outline Action Button): Điền các trường vào tài liệu hiện tại theo Tier 2 (không ghi đè phần thân bài người dùng đang soạn).
   - Hiệu ứng Loading & Phản hồi:
     - Spinner hiển thị trong nút khi đang tiêm mẫu.
     - Hộp thông báo màu xanh `CheckCircle2` "Áp dụng biểu mẫu thành công!" hoặc màu đỏ `AlertCircle` khi thiếu trường bắt buộc.

---

## 4. Thiết Kế Chi Tiết 4 Bộ Kiểm Thử Đơn Vị (Unit Test Suites)

Các file kiểm thử đặt tại `web_app/tests/unit/` sử dụng `vitest` và `@testing-library/react`.

### 4.1 Bộ Kiểm Thử 1: `web_app/tests/unit/template-catalog.test.ts`
Mục tiêu: Đảm bảo danh mục 22 biểu mẫu chuẩn, phân loại chính xác và chức năng tìm kiếm hoạt động hoàn hảo.
- **Test case 1: Số lượng mẫu biểu**:
  - `expect(CATALOG.length).toBeGreaterThanOrEqual(22)`.
- **Test case 2: Bao phủ đầy đủ 4 tổ chức**:
  - Đảm bảo tồn tại mẫu biểu của `TVCI`, `IEMM`, `TKV`, `DANG`.
- **Test case 3: Bao phủ các danh mục chính**:
  - Đảm bảo có đủ: `cong_van`, `quyet_dinh`, `thong_bao`, `to_trinh`, `bieu_mau_noi_bo` (bao gồm báo cáo, biên bản, kế hoạch, giấy mời, đơn nghỉ phép).
- **Test case 4: Định dạng tệp nguồn**:
  - Mọi bản ghi đều có `fileName` hoặc `path` kết thúc bằng `.docx`.
- **Test case 5: Tìm kiếm tiếng Việt không phân biệt hoa thường và dấu**:
  - Tìm kiếm "cong van" / "công văn" trả về danh sách công văn.
  - Tìm kiếm "quyet dinh" / "quyết định" trả về các quyết định.
  - Tìm kiếm theo mã ID ("tvci-cv", "tkv-qd", "iemm-01") trả về đúng bản ghi.
- **Test case 6: Trường bắt buộc trong metadata**:
  - Kiểm tra mọi mẫu biểu đều có `id`, `name`/`title`, `organization`, `category`, `source`/`fileName` không rỗng.

### 4.2 Bộ Kiểm Thử 2: `web_app/tests/unit/form-schema.test.ts`
Mục tiêu: Đảm bảo 8 canonical schemas chuẩn xác, đầy đủ trường bắt buộc và thuật toán format date NĐ 30 không có lỗi biên.
- **Test case 1: Đăng ký đủ 8 Canonical Schemas**:
  - `cong_van`, `quyet_dinh`, `thong_bao`, `to_trinh`, `bao_cao`, `bien_ban`, `thu_moi`, `don_nghi_phep`.
- **Test case 2: Kiểm tra trường bắt buộc của Công văn**:
  - `SO_KY_HIEU`, `NGAY_BAN_HANH`, `TRICH_YEU`, `KINH_GUI`, `NOI_DUNG`, `NGUOI_KY`.
- **Test case 3: Kiểm tra trường repeatable của Quyết định**:
  - `CAN_CU` và `QUYET_DINH_DIEU` (hoặc `DIEU_KHOAN`) phải có kiểu `repeatable`.
- **Test case 4: Bộ quy tắc ngày tháng NĐ 30/2020 (`formatAdministrativeDate`)**:
  - *Ngày đơn (1-9)*: Đệm 0 -> `ngày 01`, `ngày 05`, `ngày 09`.
  - *Ngày đôi (10-31)*: Không đệm thêm -> `ngày 10`, `ngày 29`.
  - *Tháng 1 & 2*: Đệm 0 -> `tháng 01`, `tháng 02`.
  - *Tháng 3-12*: **Không** đệm 0 -> `tháng 3`, `tháng 9`, `tháng 12`.
  - Kết quả tổng hợp: `"Hà Nội, ngày 05 tháng 02 năm 2026"`, `"Quảng Ninh, ngày 29 tháng 9 năm 2026"`.
  - Xử lý được cả đối tượng `Date` và chuỗi ISO (`"2026-09-29"`).
- **Test case 5: Kiểm tra lỗi form (Form Validation)**:
  - Hàm `validateFormValues(schema, values)`:
  - Khi thiếu trường `SO_KY_HIEU`, trả về lỗi trường tương ứng.
  - Khi các trường bắt buộc đầy đủ, trả về `{ isValid: true, errors: {} }`.

### 4.3 Bộ Kiểm Thử 3: `web_app/tests/unit/template-engine.test.ts`
Mục tiêu: Đảm bảo sinh đúng cấu trúc Tiptap AST hợp lệ (Tier 1) và cơ chế cập nhật trường/thay thế placeholder an toàn (Tier 2).
- **Test case 1: Khởi tạo tài liệu đầy đủ (Tier 1)**:
  - `renderTemplateToEditor("cong_van", values)` tạo ra JSONContent với `type: 'doc'`.
  - Bảng Header: có `tableType: 'admin-header'`, `columnRatio: '40-60'`, `isBorderless: true`.
  - Ô trái bảng Header chứa thông tin cơ quan, số ký hiệu.
  - Ô phải bảng Header chứa Quốc hiệu, Tiêu ngữ, ngày tháng hành chính chuẩn.
  - Bảng Footer: có `tableType: 'admin-footer'`, `columnRatio: '50-50'`, `isBorderless: true`.
  - Ô trái Footer chứa `Nơi nhận:`, ô phải Footer chứa chức danh và họ tên người ký.
- **Test case 2: Định dạng văn bản hành chính trong Body**:
  - Các đoạn văn bản có font `Times New Roman`, cỡ chữ 13pt/14pt, `lineSpacing: 1.2`, thụt đầu dòng 10mm (`firstLineIndentMm`).
- **Test case 3: Cập nhật trường động trong tài liệu đang mở (Tier 2)**:
  - Khởi tạo một Editor chứa tài liệu có sẵn đoạn thân bài tùy chỉnh do người dùng viết.
  - Gọi `applyTemplateFieldsToEditor(editor, { SO_KY_HIEU: '999/TVCI-VP', NGUOI_KY: 'Nguyễn Văn B' })`.
  - Xác nhận số ký hiệu và người ký được cập nhật.
  - Xác nhận nội dung các đoạn thân bài của người dùng **không bị mất hoặc bị ghi đè**.
- **Test case 4: Thay thế Regex Placeholder Fallback**:
  - Chuỗi `"Số: {{SO_KY_HIEU}}\nKính gửi: {{KINH_GUI}}"` được thay thế thành `"Số: 102/TVCI\nKính gửi: Ban Giám đốc"`.
  - Hỗ trợ cú pháp dấu ngoặc vuông `[SO_KY_HIEU]`, `[TRICH_YEU]`.
- **Test case 5: Giữ nguyên placeholder chưa điền (Graceful Retention)**:
  - Chuỗi `"Số: 102/TVCI\n{{GHI_CHU_THEM}}"`. Khi không có giá trị cho `GHI_CHU_THEM`, tag `{{GHI_CHU_THEM}}` vẫn được giữ nguyên, không gây lỗi runtime.
- **Test case 6: Làm sạch dữ liệu nhiều dòng (Multiline Sanitization)**:
  - Đầu vào `"Đoạn 1\r\n\r\nĐoạn 2\n  \nĐoạn 3"` được tách thành đúng 3 đoạn văn bản sạch, không sinh đoạn trống rác.

### 4.4 Bộ Kiểm Thử 4: `web_app/tests/unit/template-ui.test.tsx`
Mục tiêu: Đảm bảo các tương tác UI trong Sidebar tab Biểu mẫu hoạt động mượt mà và chính xác.
- **Test case 1: Render tab Biểu mẫu**:
  - Render `Sidebar` với `isOpen={true}` và `activeTab="templates"`.
  - Kiểm tra tiêu đề danh mục biểu mẫu xuất hiện.
  - Kiểm tra ô tìm kiếm xuất hiện trên màn hình.
- **Test case 2: Lọc biểu mẫu theo từ khóa tìm kiếm**:
  - Gõ "công văn" vào ô tìm kiếm -> chỉ hiển thị các thẻ có chứa "Công văn".
  - Thẻ "Quyết định" không xuất hiện trong danh sách hiển thị.
- **Test case 3: Lọc biểu mẫu theo danh mục**:
  - Nhấp vào nút lọc "Quyết định" -> hiển thị các mẫu quyết định.
- **Test case 4: Chọn mẫu biểu và hiển thị form động**:
  - Nhấp vào thẻ "Công văn TVCI chuẩn".
  - Giao diện chuyển sang chế độ Form với nút "← Danh sách mẫu".
  - Các input xuất hiện: "Số ký hiệu", "Trích yếu", "Kính gửi", "Nội dung", v.v.
- **Test case 5: Tương tác nhập liệu và Live Preview ngày tháng**:
  - Thay đổi địa danh thành "Quảng Ninh" và ngày thành `2026-09-29`.
  - Live preview hiển thị chính xác: `Quảng Ninh, ngày 29 tháng 9 năm 2026`.
- **Test case 6: Bấm nút "Áp dụng biểu mẫu"**:
  - Bấm nút "Áp dụng biểu mẫu".
  - Callback `onApplyTemplate` (hoặc chèn trực tiếp vào `editor`) được kích hoạt với đầy đủ dữ liệu người dùng đã nhập.
  - Hiển thị phản hồi trạng thái hoàn thành thành công.
- **Test case 7: Nút quay lại**:
  - Bấm nút "← Danh sách mẫu" -> màn hình trở về danh sách thẻ ban đầu.

---

## 5. Tổng Kết Kiến Trúc & Kế Hoạch Triển Khai

| Thành phần | Vị trí tệp | Nhiệm vụ chính |
|---|---|---|
| **Catalog Metadata** | `web_app/src/templates/catalog.ts` | Khai báo 22 mẫu biểu chuẩn (TVCI, IEMM, TKV, DANG), tìm kiếm fuzzy tiếng Việt. |
| **Form Schemas** | `web_app/src/templates/form-schema.ts` | 8 Canonical Schemas (`cong_van`, `quyet_dinh`, `thong_bao`, v.v.). |
| **Form Validation & Date** | `web_app/src/templates/form-validation.ts` | Hàm `formatAdministrativeDate` chuẩn NĐ 30, kiểm tra lỗi form. |
| **Template Engine** | `web_app/src/templates/engine.ts` | Tier 1 (render AST Tiptap 2 cột) + Tier 2 (dynamic fill & regex fallback). |
| **Sidebar Component** | `web_app/src/components/layout/Sidebar.tsx` | Nâng cấp tab `templates` với bộ lọc, tìm kiếm, form động, live date preview, nút áp dụng. |
| **Unit Test 1** | `web_app/tests/unit/template-catalog.test.ts` | Kiểm thử 22 mẫu, phân loại, tìm kiếm. |
| **Unit Test 2** | `web_app/tests/unit/form-schema.test.ts` | Kiểm thử 8 schema, kiểm tra lỗi, định dạng ngày tháng. |
| **Unit Test 3** | `web_app/tests/unit/template-engine.test.ts` | Kiểm thử sinh AST, tiêm trường, thay thế placeholder, giữ nguyên thân bài. |
| **Unit Test 4** | `web_app/tests/unit/template-ui.test.tsx` | Kiểm thử giao diện Sidebar, tương tác form động, callback chèn mẫu. |
