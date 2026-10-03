# Phân tích Thiết kế Thư viện Mẫu biểu Hành chính TVCI (22 Templates)
**Milestone 4: `template-library-fill`**  
**Tác giả:** M4 Explorer 1  
**Ngày lập:** 2026-09-29  

---

## 1. Tổng quan Nghiên cứu & Phạm vi

Hệ thống thư viện mẫu biểu cho ứng dụng Web TVCI (`web_app/src/templates/`) được thiết kế nhằm đáp ứng trọn vẹn:
1. **Nghị định 30/2020/NĐ-CP** ngày 05/3/2020 của Chính phủ về công tác văn thư (29 loại văn bản hành chính, bố cục bảng 2 cột cho tiêu ngữ/số hiệu và nơi nhận/người ký, quy cách lề, font chữ Times New Roman 13-14pt, giãn dòng 1.2-1.3, thụt lề đầu dòng 10-12.7mm).
2. **Quy định nhận diện & văn thư chuyên ngành:**
   - Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam (TKV).
   - Viện Cơ khí Năng lượng và Mỏ - Vinacomin (IEMM - Quyết định 731/QĐ-VCNM và Phụ lục IV, VII).
   - Trung tâm Thử nghiệm - Kiểm định Công nghiệp (TVCI / TTTN).
   - Hướng dẫn 05-HD/VPTW ngày 27/05/2026 về thể thức văn bản Đảng.
3. **Bộ kiểm thử tự động E2E:** Khớp hoàn toàn với các ca kiểm thử trong `e2e-tests/tier1-feature/f13_template_catalog.test.ts`, `f14_form_schemas.test.ts`, `f15_form_fill_date.test.ts`, `f16_template_insertion.test.ts`, và kịch bản tương tác đa phân hệ Tier 3 (`journey_template_ai_diff_export.test.ts`).

---

## 2. Bảng Danh mục 22 Biểu mẫu Hành chính Chuẩn

| # | ID | Tên tiếng Việt | Nhóm (Category) | Phân loại NĐ 30 | Đơn vị | Schema ID | Tệp mẫu (.docx) |
|---|----|----------------|-----------------|-----------------|--------|-----------|-----------------|
| 1 | `tvci-cv` | Công văn TVCI chuẩn | `cong_van` | Công văn hành chính | TVCI | `cong_van` | `tvci-cong-van-template.docx` |
| 2 | `tvci-tb` | Thông báo TVCI chuẩn | `thong_bao` | Thông báo | TVCI | `thong_bao` | `tvci-thong-bao-template.docx` |
| 3 | `tkv-qd` | Quyết định Tập đoàn TKV | `quyet_dinh` | Quyết định cá biệt | TKV | `quyet_dinh` | `tkv-quyet-dinh-template.docx` |
| 4 | `dang-sample` | Văn bản mẫu Ban Đảng | `cong_van` | Công văn / Hướng dẫn Đảng | DANG | `cong_van` | `dang-sample.docx` |
| 5 | `iemm-01` | Quyết định cá biệt | `quyet_dinh` | Quyết định cá biệt | IEMM | `quyet_dinh` | `01-quyet-dinh-ca-biet.docx` |
| 6 | `iemm-02` | Quyết định quy định | `quyet_dinh` | Quyết định ban hành VB | IEMM | `quyet_dinh` | `02-quyet-dinh-quy-dinh.docx` |
| 7 | `iemm-03` | Công văn hành chính | `cong_van` | Công văn hành chính | IEMM | `cong_van` | `03-cong-van.docx` |
| 8 | `iemm-04` | Tờ trình phê duyệt | `to_trinh` | Tờ trình | IEMM | `to_trinh` | `04-to-trinh.docx` |
| 9 | `iemm-05` | Thông báo kết luận | `thong_bao` | Thông báo | IEMM | `thong_bao` | `05-thong-bao.docx` |
| 10 | `iemm-06` | Biên bản cuộc họp | `bieu_mau_noi_bo` | Biên bản | IEMM | `bien_ban` | `06-bien-ban.docx` |
| 11 | `iemm-07` | Báo cáo công tác | `bieu_mau_noi_bo` | Báo cáo | IEMM | `bao_cao` | `07-bao-cao.docx` |
| 12 | `iemm-08` | Kế hoạch hoạt động | `bieu_mau_noi_bo` | Kế hoạch | IEMM | `bao_cao` | `08-ke-hoach.docx` |
| 13 | `iemm-09` | Chương trình công tác | `bieu_mau_noi_bo` | Chương trình / Đề án | IEMM | `bao_cao` | `09-chuong-trinh.docx` |
| 14 | `iemm-10` | Giấy mời dự họp | `bieu_mau_noi_bo` | Giấy mời | IEMM | `thu_moi` | `10-giay-moi.docx` |
| 15 | `iemm-11` | Giấy giới thiệu | `bieu_mau_noi_bo` | Giấy giới thiệu | IEMM | `cong_van` | `11-giay-gioi-thieu.docx` |
| 16 | `iemm-12` | Giấy nghỉ phép | `bieu_mau_noi_bo` | Giấy nghỉ phép | IEMM | `don_nghi_phep` | `12-giay-nghi-phep.docx` |
| 17 | `iemm-13` | Bản cam kết | `bieu_mau_noi_bo` | Bản cam kết / Thỏa thuận | IEMM | `cong_van` | `13-ban-cam-ket.docx` |
| 18 | `iemm-14` | Công văn đính chính | `cong_van` | Công văn đính chính | IEMM | `cong_van` | `14-cong-van-dinh-chinh.docx` |
| 19 | `iemm-tt-nb` | Tờ trình nội bộ | `to_trinh` | Tờ trình nội bộ | IEMM | `to_trinh` | `iemm-to-trinh-noi-bo-template.docx` |
| 20 | `iemm-don-np` | Đơn xin nghỉ phép | `bieu_mau_noi_bo` | Đơn nghỉ phép cán bộ | IEMM | `don_nghi_phep` | `iemm-don-xin-nghi-phep-template.docx` |
| 21 | `iemm-thu-moi` | Thư mời đối tác | `bieu_mau_noi_bo` | Thư mời | IEMM | `thu_moi` | `iemm-thu-moi-template.docx` |
| 22 | `tvci-sample` | Tài liệu mẫu chuẩn TVCI | `cong_van` | Mẫu chuẩn điều hành | TVCI | `cong_van` | `tvci-sample.docx` |

---

## 3. Đặc tả Chi tiết Từng Biểu mẫu (Header, Footer, Initial Content)

### 1. `tvci-cv`: Công văn TVCI chuẩn
- **Header Trái:** Cột rộng 250px (~40%). Dòng 1: "TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM" (12pt đứng). Dòng 2: "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN" (12pt đậm). Dòng 3: "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP" (11pt đậm). Dòng kẻ cơ quan 40%. Số ký hiệu: "Số: {{SO_KY_HIEU}}". Trích yếu: "{{TRICH_YEU}}" (12pt nghiêng).
- **Header Phải:** Cột rộng 374px (~60%). Quốc hiệu: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" (12pt đậm). Tiêu ngữ: "Độc lập - Tự do - Hạnh phúc" (13pt đậm). Dòng kẻ tiêu ngữ 95%. Địa danh, ngày: "{{NGAY_BAN_HANH}}" (13pt nghiêng, vd: "Hà Nội, ngày 29 tháng 9 năm 2026").
- **Thân bài mẫu:**
  - `Kính gửi: {{KINH_GUI}}` (13pt, chữ "Kính gửi:" in đậm).
  - Căn cứ chức năng, nhiệm vụ của Trung tâm Thử nghiệm - Kiểm định Công nghiệp (TVCI) trong công tác kiểm định kỹ thuật an toàn thiết bị mỏ than hầm lò;
  - `{{NOI_DUNG}}`
  - Đề nghị các đơn vị phối hợp triển khai thực hiện./.
- **Footer:** Bảng 2 cột (50-50). Cột trái: "Nơi nhận:" (12pt nghiêng đậm), các dòng nhận: "- Như trên;", "- Tổng Giám đốc Tập đoàn (để b/c);", "- Viện trưởng (để b/c);", "- Lưu: VT, TTTN.". Cột phải: "GIÁM ĐỐC TRUNG TÂM" (13pt in hoa đậm), khoảng cách ký 3 dòng, "Nguyễn Văn An" (13pt đậm).

### 2. `tvci-tb`: Thông báo TVCI chuẩn
- **Header:** Đơn vị ban hành: VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN / TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP. Số: `Số: {{SO_KY_HIEU}}`. Tiêu ngữ đầy đủ.
- **Tiêu đề giữa:** "THÔNG BÁO" (14pt in hoa đậm), trích yếu `V/v {{TRICH_YEU}}` (13pt đứng đậm có gạch chân 50%).
- **Thân bài mẫu:**
  - Thực hiện kế hoạch công tác chuyên môn quý, Trung tâm Thử nghiệm - Kiểm định Công nghiệp thông báo tới toàn thể cán bộ, kỹ sư và các phòng ban liên quan:
  - `{{NOI_DUNG}}`
- **Footer:** Nơi nhận: "- Như trên;", "- Các phòng chuyên môn;", "- Lưu: VT, TTTN.". Người ký: "KT. GIÁM ĐỐC / PHÓ GIÁM ĐỐC" - `{{NGUOI_KY}}`.

### 3. `tkv-qd`: Quyết định Tập đoàn TKV
- **Header:** Cấp trên: "ỦY BAN QUẢN LÝ VỐN NHÀ NƯỚC TẠI DOANH NGHIỆP", Cơ quan ban hành: "TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM". Số: `Số: {{SO_KY_HIEU}}`.
- **Tiêu đề giữa:** "QUYẾT ĐỊNH" (14pt in hoa đậm), trích yếu `Về việc {{TRICH_YEU}}` (13pt đậm).
- **Thẩm quyền:** "TỔNG GIÁM ĐỐC TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM" (13pt in hoa đậm).
- **Thân bài mẫu:**
  - Căn cứ Điều lệ tổ chức và hoạt động của Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam;
  - `{{CAN_CU}}`
  - "QUYẾT ĐỊNH:" (13pt in hoa đậm).
  - `{{QUYET_DINH_DIEU}}` (Điều 1, Điều 2, Điều 3...).
- **Footer:** Nơi nhận: Hội đồng thành viên (để b/c), Tổng Giám đốc, các Ban chuyên môn. Người ký: "TỔNG GIÁM ĐỐC" - `{{NGUOI_KY}}`.

### 4. `dang-sample`: Văn bản mẫu Ban Đảng
- **Header:** "ĐẢNG CỘNG SẢN VIỆT NAM" / "ĐẢNG BỘ TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM" / "ĐẢNG ỦY VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ". Số: `Số: {{SO_KY_HIEU}}`. Phía phải: Khẩu hiệu Đảng và địa danh ngày tháng.
- **Thân bài mẫu:**
  - Kính gửi: `{{KINH_GUI}}`
  - Thực hiện Hướng dẫn số 05-HD/VPTW ngày 27/05/2026 của Văn phòng Trung ương Đảng;
  - `{{NOI_DUNG}}`
- **Footer:** Nơi nhận: Thường trực Đảng ủy cấp trên, các Chi bộ trực thuộc, Lưu VP Đảng ủy. Người ký: "T/M ĐẢNG ỦY / BÍ THƯ" - `{{NGUOI_KY}}`.

### 5. `iemm-01`: Quyết định cá biệt (Viện IEMM)
- **Header:** TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM / VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN. Số: `Số: {{SO_KY_HIEU}}`.
- **Tiêu đề:** "QUYẾT ĐỊNH", trích yếu: `Về việc {{TRICH_YEU}}`.
- **Thẩm quyền:** "VIỆN TRƯỞNG VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN".
- **Thân bài:** Căn cứ thành lập và Quy chế Viện; Căn cứ đề nghị của Trưởng phòng chức năng; "QUYẾT ĐỊNH:"; Điều 1, Điều 2, Điều 3.
- **Footer:** Nơi nhận: Như Điều 3, Lãnh đạo Viện, Lưu VT, VP. Người ký: "VIỆN TRƯỞNG" - `{{NGUOI_KY}}`.

### 6. `iemm-02`: Quyết định ban hành Quy chế, Quy định
- **Thân bài:** "QUYẾT ĐỊNH / Ban hành Quy chế...". Điều 1: Ban hành kèm theo Quyết định này...; Điều 2: Hiệu lực thi hành; Điều 3: Trách nhiệm thi hành.

### 7. `iemm-03`: Công văn hành chính Viện IEMM
- Mẫu công văn chính thức của Viện trao đổi công tác với các Bộ ngành, Tập đoàn và đơn vị ngoài.

### 8. `iemm-04`: Tờ trình phê duyệt
- **Header:** VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN. Số: `Số: {{SO_KY_HIEU}}`.
- **Tiêu đề:** "TỜ TRÌNH", trích yếu: `Về việc {{TRICH_YEU}}`.
- **Kính gửi:** `Kính gửi: {{KINH_GUI}}`.
- **Thân bài:**
  - `I. SỰ CẦN THIẾT: {{SU_CAN_THIET}}`
  - `II. NỘI DUNG ĐỀ XUẤT: {{NOI_DUNG_DE_XUAT}}`
  - `III. KIẾN NGHỊ: {{KIEN_NGHI}}`
- **Footer:** Nơi nhận: Như Kính gửi, Lưu VT, KHĐT. Người ký: "VIỆN TRƯỞNG" - `{{NGUOI_KY}}`.

### 9. `iemm-05`: Thông báo kết luận cuộc họp
- Thông báo kết luận cuộc họp giao ban của Lãnh đạo Viện gửi các đơn vị cơ sở.

### 10. `iemm-06`: Biên bản cuộc họp
- **Tiêu đề:** "BIÊN BẢN", trích yếu: `{{TEN_BIEN_BAN}}`.
- **Thân bài:**
  - Thời gian: `{{THOI_GIAN}}`
  - Địa điểm: Phòng họp số 1 Viện Cơ khí Năng lượng và Mỏ.
  - Thành phần tham dự: `{{THANH_PHAN}}` (Chủ trì, Thư ký, các đại biểu).
  - Nội dung diễn biến: `{{DIEN_BIEN}}`
  - Kết luận cuộc họp: Thống nhất các nhiệm vụ trọng tâm...
- **Footer:** 2 cột cân xứng: Cột trái: "THƯ KÝ CUỘC HỌP" - ký ghi rõ họ tên; Cột phải: "CHỦ TRÌ CUỘC HỌP" - ký ghi rõ họ tên.

### 11. `iemm-07`: Báo cáo công tác
- **Tiêu đề:** "BÁO CÁO", trích yếu: `{{TRICH_YEU}}`.
- **Thân bài:** Kính gửi cấp trên; I. Kết quả đạt được (`{{KET_QUA}}`); II. Tồn tại khó khăn; III. Nhiệm vụ trọng tâm kỳ tới; IV. Đề xuất kiến nghị (`{{KIEN_NGHI}}`).
- **Footer:** Nơi nhận; Người ký: "VIỆN TRƯỞNG" - `{{NGUOI_KY}}`.

### 12. `iemm-08`: Kế hoạch hoạt động
- **Tiêu đề:** "KẾ HOẠCH", trích yếu: Triển khai công tác kiểm định an toàn và nghiên cứu ứng dụng năm...
- **Thân bài:** Mục đích, yêu cầu; Nội dung và tiến độ công việc; Phân công trách nhiệm.

### 13. `iemm-09`: Chương trình công tác / Đề án
- Chương trình phối hợp kiểm tra kỹ thuật an toàn hoặc Đề án đầu tư hiện đại hóa phòng thử nghiệm.

### 14. `iemm-10`: Giấy mời dự họp
- **Tiêu đề:** "GIẤY MỜI", trích yếu: Dự họp đánh giá kết quả nghiệm thu / Hội nghị kỹ thuật.
- **Thân bài:** Kính gửi: `{{KINH_GUI}}`; Trân trọng kính mời tham dự cuộc họp về việc `{{LY_DO}}`; Thời gian, địa điểm: `{{THOI_GIAN_DIA_DIEM}}`.

### 15. `iemm-11`: Giấy giới thiệu
- **Tiêu đề:** "GIẤY GIỚI THIỆU".
- **Thân bài:** Trân trọng giới thiệu Ông/Bà... Chức vụ... Được cử đến đơn vị... Về việc liên hệ công tác kiểm định kỹ thuật... Giấy có giá trị đến ngày...

### 16. `iemm-12`: Giấy nghỉ phép
- Giấy xác nhận cho phép nghỉ thường niên hoặc nghỉ việc riêng theo chế độ lao động.

### 17. `iemm-13`: Bản cam kết
- Bản cam kết trách nhiệm an toàn lao động hiện trường mỏ và bảo mật thông tin kỹ thuật khách hàng.

### 18. `iemm-14`: Công văn đính chính
- Đính chính các sai sót kỹ thuật hoặc số liệu trong văn bản đã phát hành.

### 19. `iemm-tt-nb`: Tờ trình nội bộ
- Tờ trình từ các phòng ban, Trung tâm TVCI trình Viện trưởng giải quyết các vấn đề chuyên môn nội bộ.

### 20. `iemm-don-np`: Đơn xin nghỉ phép
- **Tiêu ngữ:** Quốc hiệu, Tiêu ngữ. Tiêu đề: "ĐƠN XIN NGHỈ PHÉP".
- **Thân bài:** Kính gửi: Viện trưởng, Trưởng phòng TC-HC, Giám đốc TVCI; Họ và tên: `{{HO_TEN}}`; Chức vụ / Đơn vị: `{{CHUC_VU}}`; Số ngày nghỉ: `{{SO_NGAY_NGHI}}`; Lý do: `{{LY_DO}}`; Người nhận bàn giao công việc...
- **Footer:** Người làm đơn ký ghi rõ họ tên; Ý kiến duyệt của Lãnh đạo đơn vị.

### 21. `iemm-thu-moi`: Thư mời đối tác
- Thư mời trang trọng gửi lãnh đạo các đối tác bên ngoài tham dự sự kiện khoa học công nghệ.

### 22. `tvci-sample`: Tài liệu mẫu chuẩn TVCI
- Tài liệu mẫu nguyên gốc của hệ thống dùng để kiểm tra độ tương thích và kiểm thử hồi quy định dạng.

---

## 4. Thiết kế Type Definitions (`web_app/src/templates/types.ts`)

File `web_app/src/templates/types.ts` cung cấp hợp đồng kiểu dữ liệu vững chắc cho toàn bộ subsystem:

```typescript
import type { JSONContent } from '@tiptap/core';

export type TemplateCategory =
  | 'cong_van'
  | 'quyet_dinh'
  | 'thong_bao'
  | 'to_trinh'
  | 'bieu_mau_noi_bo';

export type TemplateOrganization = 'TVCI' | 'IEMM' | 'TKV' | 'DANG';

export type AdministrativeProfile =
  | 'ND30_TVCI'
  | 'TKV'
  | 'IEMM'
  | 'DANG_05_HD_VPTW_2026';

export type TemplateFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'select'
  | 'repeatable';

export interface TemplateFieldOption {
  value: string;
  label: string;
}

export interface TemplateField {
  id: string; // Khớp tag chuẩn: "SO_KY_HIEU", "NGAY_BAN_HANH", "TRICH_YEU"...
  label: string;
  type: TemplateFieldType;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  helpText?: string;
  options?: string[] | TemplateFieldOption[];
  wordTarget?: 'content-control' | 'selection' | 'manual';
}

export interface DocumentTypeSchema {
  id: string; // "cong_van" | "quyet_dinh" | "thong_bao" | "to_trinh" | "bao_cao" | "bien_ban" | "thu_moi" | "don_nghi_phep"
  name: string;
  category: 'hanh_chinh' | 'dang' | 'noi_bo';
  defaultProfile: AdministrativeProfile;
  fields: TemplateField[];
  description?: string;
}

export interface TwoColumnHeaderConfig {
  agencyUpper: string;       // vd: "TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM"
  agencyLower: string;       // vd: "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN"
  agencyDepartment?: string; // vd: "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP"
  documentSymbolPrefix: string; // vd: "Số: …/VCNM-TTTN"
  mottoUpper: string;        // "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
  mottoLower: string;        // "Độc lập - Tự do - Hạnh phúc"
  defaultLocation: string;   // vd: "Hà Nội"
}

export interface TwoColumnFooterConfig {
  recipientsTitle: string;   // "Nơi nhận:"
  defaultRecipients: string[]; // ["- Như trên;", "- Tổng Giám đốc Tập đoàn (để b/c);", "- Lưu: VT, TTTN."]
  signerPosition: string;    // "TỔNG GIÁM ĐỐC" | "VIỆN TRƯỞNG" | "GIÁM ĐỐC TRUNG TÂM" | "KT. VIỆN TRƯỞNG\nPHÓ VIỆN TRƯỞNG"
  signerName: string;        // vd: "Nguyễn Văn An"
}

export interface AdministrativeTemplate {
  id: string;                // Khóa định danh: "tvci-cv", "iemm-01"...
  name: string;              // Tên hiển thị tiếng Việt
  title: string;             // Alias tương thích với f13 test harness
  category: TemplateCategory;
  vietnameseCategory: string;// Tên nhóm tiếng Việt hành chính (Công văn, Quyết định, Tờ trình...)
  organization: TemplateOrganization;
  fileName: string;          // Tên tệp docx tương ứng
  description: string;
  schemaId: string;          // Trỏ đến schema trong CANONICAL_SCHEMAS
  defaultProfile: AdministrativeProfile;
  keywords: string[];
  headerSetup: TwoColumnHeaderConfig;
  footerSetup: TwoColumnFooterConfig;
  initialBodyParagraphs: string[];
  initialContent?: JSONContent; // Tiptap AST đầy đủ gồm bảng 2 cột header/footer và nội dung
  version: string;
  status: 'active' | 'draft' | 'archived';
}
```

---

## 5. Thiết kế Module Catalog (`web_app/src/templates/catalog.ts`)

File `web_app/src/templates/catalog.ts` cung cấp:
1. Hằng số `ADMINISTRATIVE_TEMPLATES: AdministrativeTemplate[]` gồm đầy đủ 22 bản ghi.
2. Các hàm tra cứu:
   - `getTemplateById(id: string): AdministrativeTemplate | undefined`
   - `getTemplatesByCategory(category: string): AdministrativeTemplate[]`
   - `getTemplatesByOrganization(org: TemplateOrganization): AdministrativeTemplate[]`
   - `searchAdministrativeTemplates(query: string, options?: { organization?: TemplateOrganization; category?: TemplateCategory }): AdministrativeTemplate[]`
3. Hàm sinh cây Tiptap AST:
   - `generateInitialTiptapDoc(template: AdministrativeTemplate, values?: Record<string, any>): JSONContent`

### Thuật toán Tìm kiếm Tiếng Việt Không Dấu (Fuzzy Keyword Search)
Hàm tìm kiếm áp dụng chuẩn hóa NFD khử dấu tiếng Việt (normalize vietnamese) để người dùng gõ `cong van` vẫn tìm ra `Công văn`, `to trinh` tìm ra `Tờ trình`. Điểm số ưu tiên khớp chính xác > khớp đầu từ > chứa cụm từ.

---

## 6. Ma trận Tương thích với các Feature E2E liên quan

1. **Feature 13 (`f13_template_catalog.test.ts`):**
   - Đảm bảo ít nhất 22 bản ghi (`>= 22`).
   - Phủ đủ 4 cơ quan: `TVCI`, `IEMM`, `TKV`, `DANG`.
   - Tìm kiếm được "công văn" và "quyết định".
   - Tất cả 22 bản ghi có `fileName.endsWith(".docx")`.
   - Thuộc 5 nhóm category: `cong_van`, `quyet_dinh`, `thong_bao`, `to_trinh`, `bieu_mau_noi_bo`.

2. **Feature 14 (`f14_form_schemas.test.ts`):**
   - Khớp nối chính xác với 8 canonical form schemas: `cong_van`, `quyet_dinh`, `thong_bao`, `to_trinh`, `bao_cao`, `bien_ban`, `thu_moi`, `don_nghi_phep`.
   - Các trường yêu cầu của `cong_van`: `SO_KY_HIEU`, `NGAY_BAN_HANH`, `TRICH_YEU`, `KINH_GUI`, `NOI_DUNG`, `NGUOI_KY`.
   - Các trường lặp (repeatable) của `quyet_dinh`: `CAN_CU`, `QUYET_DINH_DIEU`.

3. **Feature 15 (`f15_form_fill_date.test.ts`):**
   - Định dạng ngày hành chính chuẩn NĐ 30: Ngày 1..9 có số 0 đệm (`ngày 05`), Tháng 1, 2 có số 0 đệm (`tháng 01`, `tháng 02`), Tháng 3..12 không có số 0 đệm (`tháng 3`, `tháng 12`).

4. **Feature 16 (`f16_template_insertion.test.ts`):**
   - Tier 1: Khởi tạo Tiptap AST có cấu trúc với bảng header 2 cột (`admin-header`), body chuẩn thụt dòng 12.7mm, và bảng footer 2 cột (`admin-footer`).
   - Tier 2: Thay thế regex fallback an toàn cho cả hai kiểu cú pháp `{{TAG}}` và `[TAG]`, đồng thời giữ nguyên các placeholder chưa điền mà không gây lỗi ứng dụng.

---

## 7. Kết luận & Đề xuất Bước tiếp theo

1. Bản thiết kế 22 mẫu biểu hành chính đã đồng bộ hoàn toàn giữa yêu cầu quy định hành chính nhà nước (NĐ 30/2020/NĐ-CP) và các ca kiểm thử E2E hiện có của dự án.
2. Các bước triển khai tiếp theo cho đội ngũ implementer:
   - Tạo file `web_app/src/templates/types.ts`.
   - Tạo file `web_app/src/templates/catalog.ts` xuất `ADMINISTRATIVE_TEMPLATES` và các hàm truy vấn.
   - Tạo `web_app/src/templates/form-schema.ts` xuất `CANONICAL_SCHEMAS`.
   - Tạo `web_app/src/templates/engine.ts` xử lý 2-tier insertion và date formatting.
   - Kết nối UI modal chọn mẫu và sidebar templates panel.
