# Nghiên cứu & Thiết kế Cấu trúc Bảng Hành chính 2 Cột (Header & Footer) trong Tiptap / ProseMirror

## 1. TỔNG QUAN & MỤC TIÊU THIẾT KẾ

Theo quy chuẩn văn bản hành chính Việt Nam (Nghị định 30/2020/NĐ-CP), phần đầu văn bản (Header) và phần chân văn bản (Footer) bắt buộc phải được trình bày theo cấu trúc **2 cột song song, không hiển thị đường viền (borderless table)**:
1. **Header (Bảng đầu trang):**
   - Cột 1 (Trái): Tên cơ quan, tổ chức ban hành văn bản & Số, ký hiệu văn bản (kèm Trích yếu với Công văn).
   - Cột 2 (Phải): Quốc hiệu, Tiêu ngữ & Địa danh, ngày tháng năm ban hành.
2. **Footer (Bảng chân trang):**
   - Cột 1 (Trái): Nơi nhận (tiêu đề in đậm nghiêng, danh sách cơ quan nhận, dòng lưu văn thư).
   - Cột 2 (Phải): Quyền hạn, chức vụ, khoảng trống chữ ký và họ tên người ký.

Tài liệu này xác lập thiết kế kỹ thuật hoàn chỉnh cho Tiptap v2 (ProseMirror engine) trên nền Web App TVCI (`web_app`), bao gồm:
- Quy chuẩn kích thước, tỷ lệ cột, kiểu chữ, cỡ chữ, căn lề và khoảng cách dòng theo Nghị định 30.
- Kiến trúc mở rộng Tiptap Table (`AdministrativeTable`, `AdministrativeTableCell`, `AdminRule`).
- Quy tắc styling CSS đáp ứng: hiển thị viền hỗ trợ soạn thảo trên màn hình, ẩn viền tuyệt đối khi in ấn và xuất DOCX.
- Cấu trúc JSON mẫu chuẩn của toàn bộ văn bản (Tiptap Document JSON) để nạp trực tiếp vào canvas khi khởi tạo.

---

## 2. ĐẶC TẢ THỂ THỨC NGHỊ ĐỊNH 30/2020/NĐ-CP & THÔNG SỐ KÍCH THƯỚC

### 2.1 Không gian Khổ giấy A4 và Vùng nội dung khả dụng
- **Kích thước trang A4:** $210\text{ mm} \times 297\text{ mm}$ (tương đương $595.3\text{ pt} \times 841.9\text{ pt}$ hoặc $794\text{ px} \times 1123\text{ px}$ tại 96 DPI).
- **Quy định lề trang NĐ 30:**
  - Lề trên (Top): $20\text{ mm}$ ($56.7\text{ pt}$).
  - Lề dưới (Bottom): $20\text{ mm}$ ($56.7\text{ pt}$).
  - Lề trái (Left): $30\text{ mm}$ ($85.0\text{ pt}$) (khoảng cách gáy đóng tài liệu).
  - Lề phải (Right): $15\text{ mm}$ ($42.5\text{ pt}$).
- **Chiều rộng nội dung khả dụng ($W_{\text{content}}$):**
  $$W_{\text{content}} = 210\text{ mm} - 30\text{ mm} - 15\text{ mm} = 165\text{ mm} \approx 467.7\text{ pt} \approx 623.6\text{ px (tại 96 DPI)}$$

---

### 2.2 Bảng Đầu trang (2-Column Header Table)

#### A. Tỷ lệ phân chia cột (Column Width Ratio)
- Nghị định 30 Phụ lục I quy định:
  - Cột 1 (Trái): Chiếm từ $1/3$ đến $1/2$ chiều rộng trang in (khuyến nghị chuẩn: **40%**).
  - Cột 2 (Phải): Chiếm từ $1/2$ đến $2/3$ chiều rộng trang in (khuyến nghị chuẩn: **60%**).
- **Lý do chọn tỷ lệ 40% - 60%:**
  - Cột 2 phải chứa chuỗi Tiêu ngữ: `"Độc lập - Tự do - Hạnh phúc"` (font Times New Roman, cỡ 13-14pt bold) với chiều dài ký tự khoảng $78\text{ mm} - 82\text{ mm}$.
  - Nếu chia 50% - 50% ($82.5\text{ mm}$), chuỗi Tiêu ngữ có nguy cơ bị tràn dòng hoặc rớt từ khi người dùng chỉnh padding hoặc cỡ chữ 14pt.
  - Tỷ lệ **40% ($66\text{ mm}$ / $249\text{ px}$) - 60% ($99\text{ mm}$ / $374\text{ px}$)** đảm bảo Tiêu ngữ luôn nằm trọn vẹn trên 1 dòng, đồng thời Cột 1 đủ rộng cho tên cơ quan 2 cấp.

#### B. Quy chuẩn chi tiết các thành phần trong Header Table

| Vị trí | Thành phần | Phông chữ | Cỡ chữ | Kiểu dáng | Căn lề | Giãn dòng / Khoảng cách | Đường kẻ / Ghi chú |
|---|---|---|---|---|---|---|---|
| **Cột 1 (Trái, 40%)** | Tên cơ quan chủ quản (cấp 1) | Times New Roman | 12 - 13pt | Chữ in hoa, đứng, không đậm | Centered | Line-height: 1.15; Spacing: 0 | Có thể có hoặc không tùy cấp ban hành |
| | Tên cơ quan ban hành (cấp 2) | Times New Roman | 12 - 13pt | Chữ in hoa, đứng, **in đậm** | Centered | Line-height: 1.15; spaceBefore: 2pt | Ngay dưới tên cơ quan chủ quản |
| | Đường kẻ dưới tên cơ quan | - | - | Nét liền, mảnh (0.5 - 1pt) | Centered | Margin: 2px auto 4px | Độ dài từ **1/3 đến 1/2** độ dài dòng chữ tên cơ quan |
| | Số, ký hiệu văn bản | Times New Roman | 13pt | Chữ thường, đứng, không đậm | Centered | Line-height: 1.2; spaceBefore: 4pt | VD: `Số: 125/VCNM-TTTN` (Tuyệt đối không có chữ CV) |
| | Trích yếu công văn (nếu là Công văn) | Times New Roman | 12 - 13pt | Chữ thường, nghiêng hoặc đứng | Centered | Line-height: 1.2; spaceBefore: 2pt | Bắt đầu bằng `V/v ...`, không có dấu hai chấm sau `V/v` |
| **Cột 2 (Phải, 60%)** | Quốc hiệu (`CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM`) | Times New Roman | 12 - 13pt | Chữ in hoa, đứng, **in đậm** | Centered | Line-height: 1.15; spaceBefore: 0 | Dòng trên cùng cột phải |
| | Tiêu ngữ (`Độc lập - Tự do - Hạnh phúc`) | Times New Roman | 13 - 14pt | Chữ thường (viết hoa đầu từ), đứng, **in đậm** | Centered | Line-height: 1.15; spaceBefore: 2pt | Có gạch nối phân cách giữa các cụm từ |
| | Đường kẻ dưới Tiêu ngữ | - | - | Nét liền, mảnh (0.5 - 1pt) | Centered | Margin: 2px auto 4px | Độ dài **bằng đúng độ dài dòng chữ Tiêu ngữ** |
| | Địa danh và ngày tháng năm | Times New Roman | 13 - 14pt | Chữ thường, **in nghiêng** | Centered hoặc Right | Line-height: 1.2; spaceBefore: 4pt | Ngày < 10 đệm 0; tháng 1,2 đệm 0; tháng 3-12 không đệm 0 |

---

### 2.3 Bảng Chân trang (2-Column Footer Table)

#### A. Tỷ lệ phân chia cột (Column Width Ratio)
- Khuyến nghị chuẩn: **50% ($82.5\text{ mm}$ / $312\text{ px}$) - 50% ($82.5\text{ mm}$ / $312\text{ px}$)**.
- Phù hợp hoàn hảo vì danh sách Nơi nhận ở cột trái và khối chức danh/chữ ký ở cột phải có khối lượng trình bày tương đương nhau.

#### B. Quy chuẩn chi tiết các thành phần trong Footer Table

| Vị trí | Thành phần | Phông chữ | Cỡ chữ | Kiểu dáng | Căn lề | Giãn dòng / Khoảng cách | Ghi chú |
|---|---|---|---|---|---|---|---|
| **Cột 1 (Trái, 50%)** | Tiêu đề `Nơi nhận:` | Times New Roman | 12pt | Chữ thường, **in đậm và nghiêng** | Left | Line-height: 1.2; spaceAfter: 2pt | Bắt buộc có dấu hai chấm |
| | Danh sách cơ quan nhận | Times New Roman | 11pt | Chữ thường, đứng, không đậm | Left | Line-height: 1.15; Spacing: 1pt | Mỗi nơi nhận 1 dòng, bắt đầu bằng `- `, kết thúc bằng `;` |
| | Dòng lưu văn thư | Times New Roman | 11pt | Chữ thường, đứng, không đậm | Left | Line-height: 1.15; Spacing: 1pt | Dòng cuối: `Lưu: VT, [Đơn vị].` (NĐ 30 đã bỏ ghi số lượng bản lưu) |
| **Cột 2 (Phải, 50%)** | Quyền hạn ký (nếu có: `TM.`, `KT.`, `TL.`, `TUQ.`) | Times New Roman | 13 - 14pt | Chữ in hoa, đứng, **in đậm** | Centered | Line-height: 1.15; spaceBefore: 0 | Đặt trên dòng chức vụ (VD: `KT. VIỆN TRƯỞNG`) |
| | Chức vụ người ký | Times New Roman | 13 - 14pt | Chữ in hoa, đứng, **in đậm** | Centered | Line-height: 1.15; spaceBefore: 0 | VD: `PHÓ VIỆN TRƯỞNG` hoặc `GIÁM ĐỐC` |
| | Khoảng trống chữ ký & đóng dấu | - | - | Chiều cao $35\text{ mm} - 50\text{ mm}$ | Centered | Khoảng trống 3 - 4 dòng trắng | Chiều cao tối thiểu 60px - 80px trên giao diện |
| | Họ và tên người ký | Times New Roman | 13 - 14pt | Viết hoa chữ cái đầu, đứng, **in đậm** | Centered | Line-height: 1.2; spaceBefore: 0 | Đặt dưới khoảng trống chữ ký |

---

## 3. KIẾN TRÚC MỞ RỘNG TIPTAP V2 / PROSEMIRROR

### 3.1 Quyết định Thiết kế Cốt lõi
Thay vì tạo ra các Node riêng biệt độc lập (`adminHeader`, `adminFooter`), kiến trúc chuẩn của TVCI Web App kế thừa trực tiếp từ bộ extension chính thức của Tiptap:
- `@tiptap/extension-table`
- `@tiptap/extension-table-row`
- `@tiptap/extension-table-cell`
- `@tiptap/extension-table-header`

**Lợi thế kỹ thuật:**
1. **Tương thích DOCX 100%:** Mô hình dữ liệu OpenXML của Word biểu diễn bảng đầu trang và chân trang dưới dạng thẻ `<w:tbl>`. Khi mở rộng từ Tiptap Table, module chuyển đổi DOCX Import/Export (M2) xử lý trực tiếp qua một bộ ánh xạ chuẩn, không cần xây dựng parser riêng.
2. **Hỗ trợ Undo/Redo & Lựa chọn:** Toàn bộ phím tắt điều hướng tab, mũi tên lên/xuống, copy/paste hoạt động ổn định nhờ lõi `prosemirror-tables`.
3. **Phân biệt qua Attributes:** Phân biệt bảng hành chính bằng thuộc tính `tableType` (`'admin-header' | 'admin-footer' | 'content'`) và `isBorderless: true`.

---

### 3.2 Đặc tả Thuộc tính Node (Node Attributes)

#### A. Extension `AdministrativeTable` (kế thừa `Table`)
```typescript
// web_app/src/editor/extensions/administrative-table.ts
import Table from '@tiptap/extension-table';

export type AdministrativeTableType = 'admin-header' | 'admin-footer' | 'content';
export type AdministrativeColumnRatio = '40-60' | '50-50' | 'custom';

export const AdministrativeTable = Table.extend({
  name: 'table',

  addAttributes() {
    return {
      ...this.parent?.(),
      tableType: {
        default: 'content',
        parseHTML: (element) => element.getAttribute('data-table-type') || 'content',
        renderHTML: (attributes) => ({
          'data-table-type': attributes.tableType,
        }),
      },
      isBorderless: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-borderless') === 'true',
        renderHTML: (attributes) => ({
          'data-borderless': attributes.isBorderless ? 'true' : 'false',
        }),
      },
      columnRatio: {
        default: 'custom',
        parseHTML: (element) => element.getAttribute('data-column-ratio') || 'custom',
        renderHTML: (attributes) => ({
          'data-column-ratio': attributes.columnRatio,
        }),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const tableType = node.attrs.tableType as AdministrativeTableType;
    const isBorderless = node.attrs.isBorderless as boolean;

    const classNames = [
      'tiptap-table',
      tableType === 'admin-header' && 'admin-header-table',
      tableType === 'admin-footer' && 'admin-footer-table',
      isBorderless && 'borderless-table',
    ]
      .filter(Boolean)
      .join(' ');

    return [
      'table',
      {
        ...HTMLAttributes,
        class: classNames,
      },
      ['tbody', 0],
    ];
  },
});
```

#### B. Extension `AdministrativeTableCell` (kế thừa `TableCell`)
```typescript
// web_app/src/editor/extensions/administrative-table-cell.ts
import TableCell from '@tiptap/extension-table-cell';

export const AdministrativeTableCell = TableCell.extend({
  name: 'tableCell',

  addAttributes() {
    return {
      ...this.parent?.(),
      colwidth: {
        default: null,
        parseHTML: (element) => {
          const colwidth = element.getAttribute('data-colwidth');
          return colwidth ? colwidth.split(',').map((v) => parseInt(v, 10)) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.colwidth) return {};
          return {
            'data-colwidth': attributes.colwidth.join(','),
            style: `width: ${attributes.colwidth[0]}px`,
          };
        },
      },
      verticalAlign: {
        default: 'top',
        parseHTML: (element) => element.style.verticalAlign || 'top',
        renderHTML: (attributes) => ({
          style: `vertical-align: ${attributes.verticalAlign || 'top'}`,
        }),
      },
      cellType: {
        default: 'default',
        parseHTML: (element) => element.getAttribute('data-cell-type') || 'default',
        renderHTML: (attributes) => ({
          'data-cell-type': attributes.cellType,
        }),
      },
    };
  },
});
```

---

### 3.3 Custom Node `AdminRule` (Đường kẻ trang trí hành chính)
Nghị định 30 quy định 3 vị trí có đường kẻ ngang trang trí:
1. Dưới Tên cơ quan ban hành: độ dài $1/3 - 1/2$ độ dài dòng chữ tên cơ quan.
2. Dưới Tiêu ngữ: độ dài bằng đúng độ dài dòng chữ Tiêu ngữ.
3. Dưới Trích yếu nội dung: độ dài $1/3 - 1/2$ độ dài dòng chữ trích yếu.

Node `AdminRule` được xây dựng gọn gàng, tương thích trực tiếp với thẻ `<wps:wsp>` và tag `TVCI_HRULE:` khi xuất DOCX:
```typescript
// web_app/src/editor/extensions/admin-rule.ts
import { Node, mergeAttributes } from '@tiptap/core';

export type AdminRuleKind = 'AGENCY' | 'MOTTO' | 'ABSTRACT';

export interface AdminRuleOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    adminRule: {
      setAdminRule: (attrs: { kind: AdminRuleKind; widthPercent?: number }) => ReturnType;
    };
  }
}

export const AdminRule = Node.create<AdminRuleOptions>({
  name: 'adminRule',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      kind: {
        default: 'AGENCY' as AdminRuleKind,
        parseHTML: (element) => element.getAttribute('data-rule-kind') || 'AGENCY',
        renderHTML: (attributes) => ({
          'data-rule-kind': attributes.kind,
        }),
      },
      widthPercent: {
        default: 40,
        parseHTML: (element) => {
          const val = element.getAttribute('data-width-percent');
          return val ? parseFloat(val) : 40;
        },
        renderHTML: (attributes) => ({
          'data-width-percent': attributes.widthPercent,
          style: `width: ${attributes.widthPercent}%;`,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.admin-horizontal-rule',
      },
      {
        tag: 'hr.admin-rule',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const kind = HTMLAttributes['data-rule-kind'] || 'AGENCY';
    const percent = HTMLAttributes['data-width-percent'] || (kind === 'MOTTO' ? 95 : 40);

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `admin-horizontal-rule admin-rule-${kind.toLowerCase()}`,
        style: `width: ${percent}%; margin: 3px auto 5px; height: 1px; background-color: #000000; border: none;`,
      }),
    ];
  },

  addCommands() {
    return {
      setAdminRule:
        (attrs) =>
        ({ chain }) => {
          return chain().insertContent({ type: this.name, attrs }).run();
        },
    };
  },
});
```

---

## 4. QUY TẮC STYLING CSS, CHẾ ĐỘ HIỂN THỊ MÀN HÌNH & XUẤT IN / DOCX

### 4.1 Cơ chế Viền vô hình (Borderless) và Chỉ dẫn Soạn thảo (Edit Guides)
- **Vấn đề UX:** Nếu bảng hoàn toàn không có viền (`border: 0`), người dùng sẽ không biết nhấp chuột vào đâu để chỉnh sửa cột trái hoặc cột phải.
- **Giải pháp UX chuyên nghiệp:**
  - **Trên màn hình soạn thảo (Interactive Mode):** Hiển thị đường viền chấm đứt mờ (`1px dashed #cbd5e1`), biến mất hoặc nổi bật nhẹ khi di chuột/focus.
  - **Khi in ấn (`@media print`):** Bắt buộc ẩn hoàn toàn viền (`border: none !important; outline: none !important`).
  - **Khi xuất DOCX (M2 Contract):** OpenXML gán `<w:tblBorders>` với các cạnh `<w:top w:val="none"/>`, `<w:left w:val="none"/>`, v.v.

```css
/* web_app/src/editor/styles/administrative-tables.css */

/* Bảng hành chính tổng quát */
.tiptap-table.borderless-table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 12px 0;
  table-layout: fixed;
}

/* Cell padding tối thiểu để sát mép văn bản */
.tiptap-table.borderless-table td {
  padding: 2px 6px;
  vertical-align: top;
  box-sizing: border-box;
  /* Viền hỗ trợ định vị vùng nhập liệu khi soạn thảo */
  border: 1px dashed rgba(203, 213, 225, 0.7);
  transition: border-color 0.15s ease;
}

/* Khi hover hoặc có focus vào ô */
.tiptap-table.borderless-table td:hover,
.tiptap-table.borderless-table td:focus-within {
  border-color: #94a3b8;
}

/* Triệt tiêu lùi đầu dòng đối với các đoạn văn bên trong ô bảng */
.tiptap-table.borderless-table td p {
  text-indent: 0 !important;
  margin: 2px 0;
}

/* ================= HEADER TABLE RATIO (40% - 60%) ================= */
.tiptap-table.admin-header-table td:first-child {
  width: 40%;
  text-align: center;
}

.tiptap-table.admin-header-table td:last-child {
  width: 60%;
  text-align: center;
}

/* ================= FOOTER TABLE RATIO (50% - 50%) ================= */
.tiptap-table.admin-footer-table td:first-child {
  width: 50%;
  text-align: left;
}

.tiptap-table.admin-footer-table td:last-child {
  width: 50%;
  text-align: center;
}

/* ================= ĐƯỜNG KẺ HÀNH CHÍNH ================= */
.admin-horizontal-rule {
  display: block;
  height: 1px;
  background-color: #000000;
  margin: 3px auto 5px auto;
  user-select: none;
}

/* Khoảng trống chữ ký cột phải Footer */
.signature-blank-space {
  height: 65px;
  min-height: 50px;
}

/* ================= CHẾ ĐỘ IN ẤN (PRINT MEDIA) ================= */
@media print {
  .tiptap-table.borderless-table td {
    border: none !important;
    outline: none !important;
  }
}
```

---

## 5. CẤU TRÚC DỮ LIỆU TẬP TIN MẪU KHỞI TẠO (DEFAULT TIPTAP JSON STATE)

Dưới đây là cây trạng thái JSON mẫu hoàn chỉnh của một văn bản Công văn TVCI chuẩn (chuẩn Nghị định 30/2020/NĐ-CP). Cấu trúc này tuân thủ 100% schema của Tiptap v2 / ProseMirror, sẵn sàng hydrate trực tiếp vào editor canvas khi ứng dụng mở ra lần đầu:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "table",
      "attrs": {
        "tableType": "admin-header",
        "isBorderless": true,
        "columnRatio": "40-60"
      },
      "content": [
        {
          "type": "tableRow",
          "content": [
            {
              "type": "tableCell",
              "attrs": {
                "colspan": 1,
                "rowspan": 1,
                "colwidth": [250],
                "cellType": "header-left",
                "verticalAlign": "top"
              },
              "content": [
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "center",
                    "fontFamily": "Times New Roman",
                    "fontSize": 12,
                    "lineSpacing": 1.15,
                    "spaceBefore": 0,
                    "spaceAfter": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "text": "TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM"
                    }
                  ]
                },
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "center",
                    "fontFamily": "Times New Roman",
                    "fontSize": 12,
                    "lineSpacing": 1.15,
                    "spaceBefore": 2,
                    "spaceAfter": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "marks": [{ "type": "bold" }],
                      "text": "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN"
                    }
                  ]
                },
                {
                  "type": "adminRule",
                  "attrs": {
                    "kind": "AGENCY",
                    "widthPercent": 40
                  }
                },
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "center",
                    "fontFamily": "Times New Roman",
                    "fontSize": 13,
                    "lineSpacing": 1.2,
                    "spaceBefore": 4,
                    "spaceAfter": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "text": "Số: 125/VCNM-TTTN"
                    }
                  ]
                },
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "center",
                    "fontFamily": "Times New Roman",
                    "fontSize": 12,
                    "lineSpacing": 1.2,
                    "spaceBefore": 2,
                    "spaceAfter": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "marks": [{ "type": "italic" }],
                      "text": "V/v kiểm định kỹ thuật an toàn hệ thống thiết bị mỏ hầm lò"
                    }
                  ]
                }
              ]
            },
            {
              "type": "tableCell",
              "attrs": {
                "colspan": 1,
                "rowspan": 1,
                "colwidth": [374],
                "cellType": "header-right",
                "verticalAlign": "top"
              },
              "content": [
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "center",
                    "fontFamily": "Times New Roman",
                    "fontSize": 12,
                    "lineSpacing": 1.15,
                    "spaceBefore": 0,
                    "spaceAfter": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "marks": [{ "type": "bold" }],
                      "text": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
                    }
                  ]
                },
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "center",
                    "fontFamily": "Times New Roman",
                    "fontSize": 13,
                    "lineSpacing": 1.15,
                    "spaceBefore": 2,
                    "spaceAfter": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "marks": [{ "type": "bold" }],
                      "text": "Độc lập - Tự do - Hạnh phúc"
                    }
                  ]
                },
                {
                  "type": "adminRule",
                  "attrs": {
                    "kind": "MOTTO",
                    "widthPercent": 95
                  }
                },
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "center",
                    "fontFamily": "Times New Roman",
                    "fontSize": 13,
                    "lineSpacing": 1.2,
                    "spaceBefore": 4,
                    "spaceAfter": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "marks": [{ "type": "italic" }],
                      "text": "Hà Nội, ngày 09 tháng 9 năm 2026"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "textAlign": "left",
        "fontFamily": "Times New Roman",
        "fontSize": 13,
        "lineSpacing": 1.3,
        "spaceBefore": 14,
        "spaceAfter": 6,
        "firstLineIndentMm": 0
      },
      "content": [
        {
          "type": "text",
          "marks": [{ "type": "bold" }],
          "text": "Kính gửi: "
        },
        {
          "type": "text",
          "text": "Các đơn vị thành viên Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam."
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "textAlign": "justify",
        "fontFamily": "Times New Roman",
        "fontSize": 13,
        "lineSpacing": 1.2,
        "spaceBefore": 2,
        "spaceAfter": 2,
        "firstLineIndentMm": 12.7
      },
      "content": [
        {
          "type": "text",
          "marks": [{ "type": "italic" }],
          "text": "Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư;"
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "textAlign": "justify",
        "fontFamily": "Times New Roman",
        "fontSize": 13,
        "lineSpacing": 1.2,
        "spaceBefore": 2,
        "spaceAfter": 2,
        "firstLineIndentMm": 12.7
      },
      "content": [
        {
          "type": "text",
          "marks": [{ "type": "italic" }],
          "text": "Căn cứ chức năng, nhiệm vụ của Viện Cơ khí Năng lượng và Mỏ - VINACOMIN trong công tác kiểm định kỹ thuật an toàn lao động và thử nghiệm công nghiệp;"
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "textAlign": "justify",
        "fontFamily": "Times New Roman",
        "fontSize": 13,
        "lineSpacing": 1.2,
        "spaceBefore": 2,
        "spaceAfter": 2,
        "firstLineIndentMm": 12.7
      },
      "content": [
        {
          "type": "text",
          "text": "Nhằm đảm bảo an toàn tuyệt đối cho người lao động và thiết bị trong quá trình sản xuất than hầm lò, Trung tâm Thử nghiệm - Kiểm định Công nghiệp (TVCI) đề nghị Thủ trưởng các đơn vị phối hợp triển khai rà soát định kỳ toàn bộ hệ thống tời trục, quạt gió chính và thiết bị điện phòng nổ trước mùa mưa bão năm 2026."
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "textAlign": "justify",
        "fontFamily": "Times New Roman",
        "fontSize": 13,
        "lineSpacing": 1.2,
        "spaceBefore": 2,
        "spaceAfter": 6,
        "firstLineIndentMm": 12.7
      },
      "content": [
        {
          "type": "text",
          "text": "Kính đề nghị các đơn vị lập kế hoạch chi tiết và gửi văn bản đăng ký kiểm định về Viện trước ngày 25 tháng 9 năm 2026 để tổng hợp và bố trí lịch công tác./."
        }
      ]
    },
    {
      "type": "table",
      "attrs": {
        "tableType": "admin-footer",
        "isBorderless": true,
        "columnRatio": "50-50"
      },
      "content": [
        {
          "type": "tableRow",
          "content": [
            {
              "type": "tableCell",
              "attrs": {
                "colspan": 1,
                "rowspan": 1,
                "colwidth": [312],
                "cellType": "footer-recipients",
                "verticalAlign": "top"
              },
              "content": [
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "left",
                    "fontFamily": "Times New Roman",
                    "fontSize": 12,
                    "lineSpacing": 1.15,
                    "spaceBefore": 0,
                    "spaceAfter": 2
                  },
                  "content": [
                    {
                      "type": "text",
                      "marks": [{ "type": "bold" }, { "type": "italic" }],
                      "text": "Nơi nhận:"
                    }
                  ]
                },
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "left",
                    "fontFamily": "Times New Roman",
                    "fontSize": 11,
                    "lineSpacing": 1.15,
                    "spaceBefore": 1,
                    "spaceAfter": 1
                  },
                  "content": [
                    {
                      "type": "text",
                      "text": "- Như trên;"
                    }
                  ]
                },
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "left",
                    "fontFamily": "Times New Roman",
                    "fontSize": 11,
                    "lineSpacing": 1.15,
                    "spaceBefore": 1,
                    "spaceAfter": 1
                  },
                  "content": [
                    {
                      "type": "text",
                      "text": "- Tổng Giám đốc Tập đoàn (để b/c);"
                    }
                  ]
                },
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "left",
                    "fontFamily": "Times New Roman",
                    "fontSize": 11,
                    "lineSpacing": 1.15,
                    "spaceBefore": 1,
                    "spaceAfter": 1
                  },
                  "content": [
                    {
                      "type": "text",
                      "text": "- Ban An toàn - TKV;"
                    }
                  ]
                },
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "left",
                    "fontFamily": "Times New Roman",
                    "fontSize": 11,
                    "lineSpacing": 1.15,
                    "spaceBefore": 1,
                    "spaceAfter": 1
                  },
                  "content": [
                    {
                      "type": "text",
                      "text": "- Lưu: VT, TTTN."
                    }
                  ]
                }
              ]
            },
            {
              "type": "tableCell",
              "attrs": {
                "colspan": 1,
                "rowspan": 1,
                "colwidth": [312],
                "cellType": "footer-signer",
                "verticalAlign": "top"
              },
              "content": [
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "center",
                    "fontFamily": "Times New Roman",
                    "fontSize": 13,
                    "lineSpacing": 1.15,
                    "spaceBefore": 0,
                    "spaceAfter": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "marks": [{ "type": "bold" }],
                      "text": "KT. VIỆN TRƯỞNG"
                    }
                  ]
                },
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "center",
                    "fontFamily": "Times New Roman",
                    "fontSize": 13,
                    "lineSpacing": 1.15,
                    "spaceBefore": 2,
                    "spaceAfter": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "marks": [{ "type": "bold" }],
                      "text": "PHÓ VIỆN TRƯỞNG"
                    }
                  ]
                },
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "center",
                    "fontFamily": "Times New Roman",
                    "fontSize": 13,
                    "lineSpacing": 1.0,
                    "spaceBefore": 0,
                    "spaceAfter": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "marks": [{ "type": "italic" }],
                      "text": " "
                    }
                  ]
                },
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "center",
                    "fontFamily": "Times New Roman",
                    "fontSize": 13,
                    "lineSpacing": 1.0,
                    "spaceBefore": 0,
                    "spaceAfter": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "marks": [{ "type": "italic" }],
                      "text": " "
                    }
                  ]
                },
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "center",
                    "fontFamily": "Times New Roman",
                    "fontSize": 13,
                    "lineSpacing": 1.0,
                    "spaceBefore": 0,
                    "spaceAfter": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "marks": [{ "type": "italic" }],
                      "text": " "
                    }
                  ]
                },
                {
                  "type": "paragraph",
                  "attrs": {
                    "textAlign": "center",
                    "fontFamily": "Times New Roman",
                    "fontSize": 13,
                    "lineSpacing": 1.15,
                    "spaceBefore": 0,
                    "spaceAfter": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "marks": [{ "type": "bold" }],
                      "text": "TS. Nguyễn Văn A"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 6. HỢP ĐỒNG GIAO TIẾP VỚI CÁC PHÂN HỆ KHÁC (INTEGRATION CONTRACTS)

### 6.1 Hợp đồng với M1 Explorer 2 (Core Extensions & A4 Canvas)
- **Tương thích Extension List:**
  Editor khởi tạo cần nạp các extension theo thứ tự:
  ```typescript
  import Document from '@tiptap/extension-document';
  import Paragraph from '@tiptap/extension-paragraph';
  import Text from '@tiptap/extension-text';
  import Bold from '@tiptap/extension-bold';
  import Italic from '@tiptap/extension-italic';
  import Underline from '@tiptap/extension-underline';
  import TextAlign from '@tiptap/extension-text-align';
  import { AdministrativeTable } from './extensions/administrative-table';
  import TableRow from '@tiptap/extension-table-row';
  import { AdministrativeTableCell } from './extensions/administrative-table-cell';
  import TableHeader from '@tiptap/extension-table-header';
  import { AdminRule } from './extensions/admin-rule';

  export const defaultExtensions = [
    Document,
    Paragraph, // được mở rộng attributes: fontSize, fontFamily, lineSpacing, spaceBefore, spaceAfter, firstLineIndentMm
    Text,
    Bold,
    Italic,
    Underline,
    TextAlign.configure({ types: ['paragraph', 'heading'] }),
    AdministrativeTable.configure({ resizable: false }), // cố định tỷ lệ chuẩn cho bảng hành chính
    TableRow,
    AdministrativeTableCell,
    TableHeader,
    AdminRule,
  ];
  ```

### 6.2 Hợp đồng với M2 (DOCX Interoperability Engine)
1. **Xuất sang OpenXML (`docx` npm package):**
   - Khi gặp node `table` có `attrs.isBorderless === true`:
     Tạo `Table` với thuộc tính `borders: TableBorders.NONE`.
   - `colwidth` được chuyển thành `columnWidths: [WidthType.PERCENTAGE(40), WidthType.PERCENTAGE(60)]` hoặc theo điểm twip.
   - Khi gặp node `adminRule`:
     - Nếu `kind === 'AGENCY'`: chèn đường kẻ ngang độ dài 40% căn giữa.
     - Nếu `kind === 'MOTTO'`: chèn đường kẻ ngang độ dài 95% căn giữa.
2. **Nhập từ DOCX (`jszip` / `mammoth`):**
   - Hàng đầu tiên nếu có bảng 1 hàng 2 cột không viền $\rightarrow$ tự động map thành node `table` với `attrs.tableType = 'admin-header'` và `attrs.isBorderless = true`.
   - Bảng cuối cùng nếu là 1 hàng 2 cột không viền chứa từ khóa `Nơi nhận` $\rightarrow$ tự động map thành `attrs.tableType = 'admin-footer'`.

### 6.3 Hợp đồng với M3 (Administrative Format Engine)
- Hàm `extractDocumentSnapshot(doc: TiptapJSON)` duyệt cây AST:
  - Các đoạn `paragraph` bên trong `tableCell` được lập chỉ mục kèm vị trí ngữ cảnh (VD: `context: "header-left"`, `context: "header-right"`, `context: "footer-recipients"`, `context: "footer-signer"`).
  - Bộ kiểm tra thể thức áp dụng bộ quy tắc đặc thù cho từng ô:
    - `header-left`: kiểm tra font 12-13pt, căn giữa, không thụt đầu dòng.
    - `header-right`: kiểm tra Quốc hiệu in hoa đậm, Tiêu ngữ đậm, ngày tháng in nghiêng.
    - `footer-recipients`: kiểm tra tiêu đề Nơi nhận 12pt đậm nghiêng, các dòng con 11pt thường đứng kết thúc bằng `;`, dòng lưu kết thúc bằng `.`.
    - `footer-signer`: kiểm tra chức vụ in hoa đậm, họ tên in đậm.
- Nhờ có cấu trúc bảng chuẩn này, điểm số đánh giá thể thức (`healthScore`) của tài liệu khởi tạo sẽ đạt **100% PASS** ngay từ lần nạp đầu tiên!
