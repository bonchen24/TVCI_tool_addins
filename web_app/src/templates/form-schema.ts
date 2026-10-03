/**
 * 8 Canonical Vietnamese Administrative Form Schemas
 * Strictly conforming to Nghị định 30/2020/NĐ-CP & TVCI Standards.
 * Dual-key support for camelCase and SCREAMING_SNAKE_CASE tags.
 */

import type {
  DocumentFormSchema,
  DocumentTypeSchema,
  FormFieldDefinition,
  FormFieldOption,
  TemplateField,
  TemplateFormValues,
} from './types';

// Re-export type aliases
export type { DocumentFormSchema, DocumentTypeSchema, FormFieldDefinition, FormFieldOption };

/** Helper constructors for declarative field definitions */
function createTextField(
  id: string,
  label: string,
  opts: Partial<TemplateField> = {}
): TemplateField {
  return {
    id,
    tag: opts.tag || id,
    label,
    type: 'text',
    ...opts,
  };
}

function createTextareaField(
  id: string,
  label: string,
  opts: Partial<TemplateField> = {}
): TemplateField {
  return {
    id,
    tag: opts.tag || id,
    label,
    type: 'textarea',
    ...opts,
  };
}

function createDateField(
  id: string,
  label: string,
  opts: Partial<TemplateField> = {}
): TemplateField {
  return {
    id,
    tag: opts.tag || id,
    label,
    type: 'date',
    validationType: 'date',
    ...opts,
  };
}

function createRepeatableField(
  id: string,
  label: string,
  opts: Partial<TemplateField> = {}
): TemplateField {
  return {
    id,
    tag: opts.tag || id,
    label,
    type: 'repeatable',
    ...opts,
  };
}

/** 8 Canonical Administrative Schemas per NĐ 30/2020/NĐ-CP */
export const FORM_SCHEMAS: DocumentFormSchema[] = [
  {
    id: 'cong_van',
    name: 'Công văn',
    category: 'hanh_chinh',
    defaultProfile: 'ND30_TVCI',
    description: 'Công văn hành chính gửi các cơ quan, đơn vị thành viên và đối tác',
    aliases: ['CONG_VAN', 'Công văn', 'congvan'],
    fields: [
      createTextField('agencyName', 'Cơ quan ban hành', {
        tag: 'CO_QUAN_BAN_HANH',
        aliases: ['CO_QUAN_BAN_HANH', 'agencyName'],
        defaultValue: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
        required: true,
      }),
      createTextField('parentAgencyName', 'Cơ quan chủ quản', {
        tag: 'CO_QUAN_CHU_QUAN',
        aliases: ['CO_QUAN_CHU_QUAN', 'parentAgencyName'],
        defaultValue: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      }),
      createTextField('SO_KY_HIEU', 'Số và ký hiệu', {
        tag: 'SO_KY_HIEU',
        aliases: ['documentNumber', 'subSymbol', 'soKyHieu'],
        required: true,
        defaultValue: '102/TVCI-VP',
        placeholder: '102/TVCI-VP',
        validationType: 'documentNumber',
      }),
      createTextField('place', 'Địa danh', {
        tag: 'place',
        aliases: ['place', 'diaDanh'],
        defaultValue: 'Hà Nội',
        required: true,
      }),
      createDateField('NGAY_BAN_HANH', 'Ngày ban hành', {
        tag: 'NGAY_BAN_HANH',
        aliases: ['date', 'ngayBanHanh', 'dateStr'],
        required: true,
        defaultValue: '2026-09-29',
      }),
      createTextField('TRICH_YEU', 'Trích yếu nội dung', {
        tag: 'TRICH_YEU',
        aliases: ['subject', 'abstract', 'trichYeu'],
        required: true,
        placeholder: 'V/v kiểm định kỹ thuật an toàn hệ thống thiết bị',
        defaultValue: 'V/v kiểm định kỹ thuật an toàn hệ thống thiết bị mỏ than hầm lò',
      }),
      createTextField('KINH_GUI', 'Kính gửi', {
        tag: 'KINH_GUI',
        aliases: ['directRecipients', 'kinhGui', 'NOI_NHAN_TRUC_TIEP'],
        required: true,
        placeholder: 'Các đơn vị thành viên Tập đoàn',
        defaultValue: 'Các đơn vị thành viên Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam',
      }),
      createTextareaField('NOI_DUNG', 'Nội dung công văn', {
        tag: 'NOI_DUNG',
        aliases: ['body', 'content', 'noiDung'],
        required: true,
        placeholder: 'Nhập nội dung công văn chi tiết...',
        defaultValue:
          'Nhằm đảm bảo an toàn tuyệt đối cho người lao động và thiết bị trong quá trình sản xuất than hầm lò, Trung tâm Thử nghiệm - Kiểm định Công nghiệp (TVCI) đề nghị các đơn vị phối hợp triển khai rà soát định kỳ toàn bộ hệ thống tời trục và thiết bị điện phòng nổ trước mùa mưa bão năm 2026.\n\nKính đề nghị các đơn vị lập kế hoạch chi tiết và gửi văn bản đăng ký kiểm định về Trung tâm để tổng hợp và bố trí lịch công tác./.',
      }),
      createTextField('signerRole', 'Chức vụ người ký', {
        tag: 'signerRole',
        aliases: ['signerRole', 'chucVuNguoiKy'],
        defaultValue: 'GIÁM ĐỐC',
        required: true,
      }),
      createTextField('NGUOI_KY', 'Người ký', {
        tag: 'NGUOI_KY',
        aliases: ['signerName', 'nguoiKy'],
        required: true,
        defaultValue: 'Nguyễn Văn An',
      }),
      createRepeatableField('NOI_NHAN', 'Nơi nhận', {
        tag: 'NOI_NHAN',
        aliases: ['recipients', 'noiNhan'],
        required: true,
        defaultValue: ['- Như trên;', '- Tổng Giám đốc Tập đoàn (để b/c);', '- Lưu: VT, TTTN.'],
      }),
    ],
  },
  {
    id: 'quyet_dinh',
    name: 'Quyết định',
    category: 'hanh_chinh',
    defaultProfile: 'ND30_TVCI',
    description: 'Quyết định hành chính (cá biệt hoặc ban hành quy định)',
    aliases: ['QUYET_DINH', 'Quyết định', 'quyetdinh'],
    fields: [
      createTextField('agencyName', 'Cơ quan ban hành', {
        tag: 'CO_QUAN_BAN_HANH',
        aliases: ['CO_QUAN_BAN_HANH', 'agencyName'],
        defaultValue: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
        required: true,
      }),
      createTextField('parentAgencyName', 'Cơ quan chủ quản', {
        tag: 'CO_QUAN_CHU_QUAN',
        aliases: ['CO_QUAN_CHU_QUAN', 'parentAgencyName'],
        defaultValue: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      }),
      createTextField('SO_KY_HIEU', 'Số và ký hiệu', {
        tag: 'SO_KY_HIEU',
        aliases: ['documentNumber', 'soKyHieu'],
        required: true,
        defaultValue: '123/QĐ-TVCI',
        placeholder: '123/QĐ-TVCI',
        validationType: 'documentNumber',
      }),
      createTextField('place', 'Địa danh', {
        tag: 'place',
        aliases: ['place', 'diaDanh'],
        defaultValue: 'Hà Nội',
        required: true,
      }),
      createDateField('NGAY_BAN_HANH', 'Ngày ban hành', {
        tag: 'NGAY_BAN_HANH',
        aliases: ['date', 'ngayBanHanh'],
        required: true,
        defaultValue: '2026-09-29',
      }),
      createTextField('TRICH_YEU', 'Về việc', {
        tag: 'TRICH_YEU',
        aliases: ['subject', 'abstract', 'trichYeu'],
        required: true,
        placeholder: 'V/v phê duyệt kết quả đánh giá kỹ thuật an toàn mỏ',
        defaultValue: 'Về việc phê duyệt kế hoạch kiểm định an toàn kỹ thuật năm 2026',
      }),
      createRepeatableField('CAN_CU', 'Căn cứ pháp lý', {
        tag: 'CAN_CU',
        aliases: ['legalBases', 'canCu'],
        required: true,
        defaultValue: [
          'Căn cứ Luật An toàn, vệ sinh lao động ngày 25 tháng 6 năm 2015;',
          'Căn cứ Quyết định số 731/QĐ-VCNM của Viện trưởng Viện Cơ khí Năng lượng và Mỏ về quy chế tổ chức;',
          'Xét đề nghị của Trưởng phòng Kế hoạch Kỹ thuật Trung tâm TVCI,',
        ],
      }),
      createRepeatableField('QUYET_DINH_DIEU', 'Các điều khoản quyết định', {
        tag: 'QUYET_DINH_DIEU',
        aliases: ['decisionClauses', 'DIEU_KHOAN', 'dieuKhoan'],
        required: true,
        defaultValue: [
          'Điều 1. Phê duyệt kế hoạch triển khai kiểm định an toàn hệ thống tời trục giếng đứng tại các mỏ than hầm lò.',
          'Điều 2. Giao các phòng chuyên môn bố trí nhân lực, thiết bị đo lường chuẩn hóa để thực hiện nhiệm vụ.',
          'Điều 3. Các ông (bà) Trưởng phòng chức năng và các đơn vị liên quan chịu trách nhiệm thi hành Quyết định này./.',
        ],
      }),
      createTextField('signerRole', 'Chức vụ người ký', {
        tag: 'signerRole',
        aliases: ['signerRole', 'chucVuNguoiKy'],
        defaultValue: 'GIÁM ĐỐC',
        required: true,
      }),
      createTextField('NGUOI_KY', 'Người ký', {
        tag: 'NGUOI_KY',
        aliases: ['signerName', 'nguoiKy'],
        required: true,
        defaultValue: 'Nguyễn Văn An',
      }),
      createRepeatableField('NOI_NHAN', 'Nơi nhận', {
        tag: 'NOI_NHAN',
        aliases: ['recipients', 'noiNhan'],
        required: true,
        defaultValue: ['- Như Điều 3;', '- Lãnh đạo Viện (để b/c);', '- Lưu: VT, TCHC.'],
      }),
    ],
  },
  {
    id: 'thong_bao',
    name: 'Thông báo',
    category: 'hanh_chinh',
    defaultProfile: 'ND30_TVCI',
    description: 'Thông báo hành chính, kết luận cuộc họp, lịch nghỉ lễ',
    aliases: ['THONG_BAO', 'Thông báo', 'thongbao'],
    fields: [
      createTextField('agencyName', 'Cơ quan ban hành', {
        tag: 'CO_QUAN_BAN_HANH',
        aliases: ['CO_QUAN_BAN_HANH', 'agencyName'],
        defaultValue: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
        required: true,
      }),
      createTextField('parentAgencyName', 'Cơ quan chủ quản', {
        tag: 'CO_QUAN_CHU_QUAN',
        aliases: ['CO_QUAN_CHU_QUAN', 'parentAgencyName'],
        defaultValue: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      }),
      createTextField('SO_KY_HIEU', 'Số và ký hiệu', {
        tag: 'SO_KY_HIEU',
        aliases: ['documentNumber', 'soKyHieu'],
        required: true,
        defaultValue: '12/TB-TVCI',
        placeholder: '12/TB-TVCI',
        validationType: 'documentNumber',
      }),
      createTextField('place', 'Địa danh', {
        tag: 'place',
        defaultValue: 'Hà Nội',
        required: true,
      }),
      createDateField('NGAY_BAN_HANH', 'Ngày ban hành', {
        tag: 'NGAY_BAN_HANH',
        aliases: ['date', 'ngayBanHanh'],
        required: true,
        defaultValue: '2026-09-29',
      }),
      createTextField('TRICH_YEU', 'Về việc', {
        tag: 'TRICH_YEU',
        aliases: ['subject', 'abstract', 'trichYeu'],
        required: true,
        placeholder: 'V/v lịch trực an toàn hiện trường tháng 10 năm 2026',
        defaultValue: 'V/v kế hoạch kiểm định an toàn thiết bị mỏ than',
      }),
      createTextField('DOI_TUONG_NHAN', 'Kính gửi / Đối tượng nhận', {
        tag: 'DOI_TUONG_NHAN',
        aliases: ['directRecipients', 'KINH_GUI', 'recipientScope'],
        required: false,
        defaultValue: 'Toàn thể cán bộ, kỹ sư và chuyên viên Trung tâm',
      }),
      createTextareaField('NOI_DUNG', 'Nội dung thông báo', {
        tag: 'NOI_DUNG',
        aliases: ['body', 'content', 'noiDung'],
        required: true,
        defaultValue:
          'Thực hiện kế hoạch công tác kiểm định an toàn quý IV năm 2026, Trung tâm Thử nghiệm - Kiểm định Công nghiệp thông báo tới toàn thể cán bộ nhân viên kế hoạch triển khai công tác kiểm định thực địa tại các mỏ than vùng Quảng Ninh.\n\nYêu cầu các phòng chuyên môn hoàn tất công tác chuẩn bị thiết bị đo kiểm trước ngày khởi hành./.',
      }),
      createTextField('signerRole', 'Chức vụ người ký', {
        tag: 'signerRole',
        aliases: ['signerRole', 'chucVuNguoiKy'],
        defaultValue: 'KT. GIÁM ĐỐC\nPHÓ GIÁM ĐỐC',
        required: true,
      }),
      createTextField('NGUOI_KY', 'Người ký', {
        tag: 'NGUOI_KY',
        aliases: ['signerName', 'nguoiKy'],
        required: true,
        defaultValue: 'Trần Văn Bình',
      }),
      createRepeatableField('NOI_NHAN', 'Nơi nhận', {
        tag: 'NOI_NHAN',
        aliases: ['recipients', 'noiNhan'],
        required: false,
        defaultValue: ['- Như trên;', '- Giám đốc Trung tâm (để b/c);', '- Lưu: VT, VP.'],
      }),
    ],
  },
  {
    id: 'to_trinh',
    name: 'Tờ trình',
    category: 'hanh_chinh',
    defaultProfile: 'ND30_TVCI',
    description: 'Tờ trình xin phê duyệt chủ trương, phương án hoặc kinh phí',
    aliases: ['TO_TRINH', 'Tờ trình', 'totrinh'],
    fields: [
      createTextField('agencyName', 'Cơ quan ban hành', {
        tag: 'CO_QUAN_BAN_HANH',
        aliases: ['CO_QUAN_BAN_HANH', 'agencyName'],
        defaultValue: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
        required: true,
      }),
      createTextField('parentAgencyName', 'Cơ quan chủ quản', {
        tag: 'CO_QUAN_CHU_QUAN',
        aliases: ['CO_QUAN_CHU_QUAN', 'parentAgencyName'],
        defaultValue: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      }),
      createTextField('SO_KY_HIEU', 'Số và ký hiệu', {
        tag: 'SO_KY_HIEU',
        aliases: ['documentNumber', 'soKyHieu'],
        required: true,
        defaultValue: '32/TTr-TVCI',
        placeholder: '32/TTr-TVCI',
        validationType: 'documentNumber',
      }),
      createTextField('place', 'Địa danh', {
        tag: 'place',
        defaultValue: 'Hà Nội',
        required: true,
      }),
      createDateField('NGAY_BAN_HANH', 'Ngày ban hành', {
        tag: 'NGAY_BAN_HANH',
        aliases: ['date', 'ngayBanHanh'],
        required: true,
        defaultValue: '2026-09-29',
      }),
      createTextField('TRICH_YEU', 'Về việc', {
        tag: 'TRICH_YEU',
        aliases: ['subject', 'abstract', 'trichYeu'],
        required: true,
        placeholder: 'V/v phê duyệt kế hoạch mua sắm thiết bị thử nghiệm',
        defaultValue: 'Về việc phê duyệt chủ trương nâng cấp thiết bị thử nghiệm phòng nổ',
      }),
      createTextField('KINH_GUI', 'Kính gửi', {
        tag: 'KINH_GUI',
        aliases: ['directRecipients', 'kinhGui'],
        required: true,
        defaultValue: 'Viện trưởng Viện Cơ khí Năng lượng và Mỏ - Vinacomin',
      }),
      createRepeatableField('CAN_CU', 'Căn cứ pháp lý', {
        tag: 'CAN_CU',
        aliases: ['legalBases', 'canCu'],
        required: false,
        defaultValue: [
          'Căn cứ Quy chế quản lý tài chính và đầu tư của Viện;',
          'Căn cứ nhu cầu kiểm định thực tế của khách hàng năm 2026;',
        ],
      }),
      createTextareaField('SU_CAN_THIET', 'Sự cần thiết', {
        tag: 'SU_CAN_THIET',
        aliases: ['proposalNecessity', 'LY_DO', 'suCanThiet'],
        required: true,
        defaultValue:
          'Hiện nay thiết bị kiểm định cao áp tại phòng thử nghiệm đã khấu hao hết, cần bổ sung module đo lường kỹ thuật số mới nhằm đảm bảo độ chính xác theo chuẩn ISO 17025.',
      }),
      createTextareaField('NOI_DUNG_DE_XUAT', 'Nội dung đề xuất', {
        tag: 'NOI_DUNG_DE_XUAT',
        aliases: ['proposalContent', 'DE_XUAT_KIEN_NGHI', 'noiDungDeXuat'],
        required: true,
        defaultValue:
          'Kính đề nghị Viện trưởng phê duyệt kinh phí đầu tư mua sắm 01 bộ thiết bị đo kiểm độ rò điện cao áp với tổng mức đầu tư dự kiến 350.000.000 đồng từ quỹ phát triển sự nghiệp của đơn vị.',
      }),
      createTextField('signerRole', 'Chức vụ người ký', {
        tag: 'signerRole',
        aliases: ['signerRole', 'chucVuNguoiKy'],
        defaultValue: 'GIÁM ĐỐC TRUNG TÂM',
        required: true,
      }),
      createTextField('NGUOI_KY', 'Người ký', {
        tag: 'NGUOI_KY',
        aliases: ['signerName', 'nguoiKy'],
        required: true,
        defaultValue: 'Nguyễn Văn An',
      }),
      createRepeatableField('NOI_NHAN', 'Nơi nhận', {
        tag: 'NOI_NHAN',
        aliases: ['recipients', 'noiNhan'],
        required: false,
        defaultValue: ['- Như kính gửi;', '- Phòng KHĐT Viện;', '- Lưu: VT, TTTN.'],
      }),
    ],
  },
  {
    id: 'bao_cao',
    name: 'Báo cáo',
    category: 'hanh_chinh',
    defaultProfile: 'ND30_TVCI',
    description: 'Báo cáo công tác định kỳ (tháng, quý, năm) hoặc báo cáo chuyên đề',
    aliases: ['BAO_CAO', 'Báo cáo', 'baocao'],
    fields: [
      createTextField('agencyName', 'Cơ quan ban hành', {
        tag: 'CO_QUAN_BAN_HANH',
        aliases: ['CO_QUAN_BAN_HANH', 'agencyName'],
        defaultValue: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
        required: true,
      }),
      createTextField('parentAgencyName', 'Cơ quan chủ quản', {
        tag: 'CO_QUAN_CHU_QUAN',
        aliases: ['CO_QUAN_CHU_QUAN', 'parentAgencyName'],
        defaultValue: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      }),
      createTextField('SO_KY_HIEU', 'Số và ký hiệu', {
        tag: 'SO_KY_HIEU',
        aliases: ['documentNumber', 'soKyHieu'],
        required: true,
        defaultValue: '45/BC-TVCI',
        placeholder: '45/BC-TVCI',
        validationType: 'documentNumber',
      }),
      createTextField('place', 'Địa danh', {
        tag: 'place',
        defaultValue: 'Hà Nội',
        required: true,
      }),
      createDateField('NGAY_BAN_HANH', 'Ngày ban hành', {
        tag: 'NGAY_BAN_HANH',
        aliases: ['date', 'ngayBanHanh'],
        required: true,
        defaultValue: '2026-09-29',
      }),
      createTextField('TRICH_YEU', 'Về việc', {
        tag: 'TRICH_YEU',
        aliases: ['subject', 'abstract', 'trichYeu'],
        required: true,
        placeholder: 'Báo cáo kết quả kiểm định an toàn quý III năm 2026',
        defaultValue: 'Báo cáo công tác thử nghiệm - kiểm định quý III năm 2026',
      }),
      createTextField('KY_BAO_CAO', 'Kỳ báo cáo', {
        tag: 'KY_BAO_CAO',
        aliases: ['reportPeriod', 'kyBaoCao'],
        required: true,
        defaultValue: 'Quý III năm 2026',
      }),
      createTextField('KINH_GUI', 'Kính gửi cấp trên', {
        tag: 'KINH_GUI',
        aliases: ['directRecipients', 'kinhGui'],
        required: false,
        defaultValue: 'Ban Lãnh đạo Viện Cơ khí Năng lượng và Mỏ',
      }),
      createTextareaField('KET_QUA', 'Kết quả đạt được', {
        tag: 'KET_QUA',
        aliases: ['reportResults', 'NOI_DUNG', 'ketQua'],
        required: true,
        defaultValue:
          'Trong quý III năm 2026, Trung tâm đã thực hiện kiểm định 52 lượt hệ thống tời trục, thử nghiệm độ bền 110 mẫu cáp thép và hiệu chuẩn 85 cảm biến áp suất. Doanh thu dịch vụ kỹ thuật đạt 115% kế hoạch đề ra, đảm bảo tuyệt đối an toàn lao động trong suốt quá trình thử nghiệm.',
      }),
      createTextareaField('KIEN_NGHI', 'Kiến nghị đề xuất', {
        tag: 'KIEN_NGHI',
        aliases: ['reportProposals', 'kienNghi'],
        required: false,
        defaultValue:
          'Đề nghị Viện tiếp tục hỗ trợ nguồn kinh phí để cử cán bộ kỹ thuật tham gia các khóa đào tạo chuyên sâu về tiêu chuẩn kiểm định an toàn quốc tế.',
      }),
      createTextField('signerRole', 'Chức vụ người ký', {
        tag: 'signerRole',
        aliases: ['signerRole', 'chucVuNguoiKy'],
        defaultValue: 'GIÁM ĐỐC TRUNG TÂM',
        required: true,
      }),
      createTextField('NGUOI_KY', 'Người ký', {
        tag: 'NGUOI_KY',
        aliases: ['signerName', 'nguoiKy'],
        required: true,
        defaultValue: 'Nguyễn Văn An',
      }),
      createRepeatableField('NOI_NHAN', 'Nơi nhận', {
        tag: 'NOI_NHAN',
        aliases: ['recipients', 'noiNhan'],
        required: false,
        defaultValue: ['- Như kính gửi;', '- Lưu: VT, TH.'],
      }),
    ],
  },
  {
    id: 'bien_ban',
    name: 'Biên bản',
    category: 'noi_bo',
    defaultProfile: 'IEMM',
    description: 'Biên bản cuộc họp, hội nghị nghiệm thu kỹ thuật',
    aliases: ['BIEN_BAN', 'Biên bản', 'bienban'],
    fields: [
      createTextField('agencyName', 'Đơn vị lập biên bản', {
        tag: 'CO_QUAN_BAN_HANH',
        aliases: ['CO_QUAN_BAN_HANH', 'agencyName'],
        defaultValue: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
        required: true,
      }),
      createTextField('TEN_BIEN_BAN', 'Tên biên bản', {
        tag: 'TEN_BIEN_BAN',
        aliases: ['meetingTitle', 'TRICH_YEU', 'subject'],
        required: true,
        defaultValue: 'Biên bản kiểm tra nghiệm thu kỹ thuật an toàn tời trục',
      }),
      createTextField('THOI_GIAN', 'Thời gian lập', {
        tag: 'THOI_GIAN',
        aliases: ['meetingTime', 'thoiGian'],
        required: true,
        defaultValue: 'Vào hồi 08 giờ 30 ngày 29 tháng 9 năm 2026',
      }),
      createTextField('DIA_DIEM', 'Địa điểm', {
        tag: 'DIA_DIEM',
        aliases: ['meetingLocation', 'diaDiem', 'place'],
        required: true,
        defaultValue: 'Phòng họp số 1 Viện Cơ khí Năng lượng và Mỏ',
      }),
      createTextField('CHU_TRI', 'Chủ trì cuộc họp', {
        tag: 'CHU_TRI',
        aliases: ['chairperson', 'chuTri'],
        required: true,
        defaultValue: 'Nguyễn Văn An - Giám đốc Trung tâm',
      }),
      createTextField('THU_KY', 'Thư ký', {
        tag: 'THU_KY',
        aliases: ['secretary', 'thuKy'],
        required: true,
        defaultValue: 'Trần Thị Bích - Chuyên viên',
      }),
      createTextareaField('THANH_PHAN', 'Thành phần tham dự', {
        tag: 'THANH_PHAN',
        aliases: ['attendees', 'thanhPhan'],
        required: true,
        defaultValue:
          '1. Đại diện TVCI: Ông Nguyễn Văn An (Giám đốc), Ông Phạm Quốc Hưng (Kỹ sư trưởng);\n2. Đại diện đơn vị khách hàng: Lãnh đạo Công ty Than Vàng Danh;',
      }),
      createTextareaField('DIEN_BIEN', 'Diễn biến cuộc họp', {
        tag: 'DIEN_BIEN',
        aliases: ['meetingContent', 'NOI_DUNG_DIEN_BIEN', 'dienBien'],
        required: true,
        defaultValue:
          'Đoàn kiểm định đã tiến hành kiểm tra thực nghiệm các thông số an toàn cơ điện của hệ thống tời trục, bao gồm: hệ thống phanh an toàn, van thủy lực và cảm biến giới hạn hành trình. Các thông số đều đáp ứng quy chuẩn kỹ thuật quốc gia QCVN 01:2011/BCT.',
      }),
      createTextareaField('KET_LUAN', 'Kết luận cuộc họp', {
        tag: 'KET_LUAN',
        aliases: ['meetingConclusion', 'ketLuan'],
        required: true,
        defaultValue:
          'Hội đồng thống nhất thông qua kết quả kiểm định kỹ thuật an toàn tời trục và cấp giấy chứng nhận kiểm định theo quy định. Cuộc họp kết thúc lúc 11 giờ 30 cùng ngày.',
      }),
      createTextField('NGUOI_KY', 'Người ký', {
        tag: 'NGUOI_KY',
        aliases: ['signerName', 'nguoiKy'],
        required: false,
        defaultValue: 'Thư ký và Chủ trì ký tên',
      }),
    ],
  },
  {
    id: 'ke_hoach',
    name: 'Kế hoạch',
    category: 'hanh_chinh',
    defaultProfile: 'ND30_TVCI',
    description: 'Kế hoạch công tác, kế hoạch kiểm định và triển khai nhiệm vụ chuyên môn',
    aliases: ['KE_HOACH', 'Kế hoạch', 'kehoach'],
    fields: [
      createTextField('agencyName', 'Cơ quan ban hành', {
        tag: 'CO_QUAN_BAN_HANH',
        aliases: ['CO_QUAN_BAN_HANH', 'agencyName'],
        defaultValue: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
        required: true,
      }),
      createTextField('parentAgencyName', 'Cơ quan chủ quản', {
        tag: 'CO_QUAN_CHU_QUAN',
        aliases: ['CO_QUAN_CHU_QUAN', 'parentAgencyName'],
        defaultValue: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      }),
      createTextField('SO_KY_HIEU', 'Số và ký hiệu', {
        tag: 'SO_KY_HIEU',
        aliases: ['documentNumber', 'soKyHieu'],
        required: true,
        defaultValue: '18/KH-TVCI',
        placeholder: '18/KH-TVCI',
        validationType: 'documentNumber',
      }),
      createTextField('place', 'Địa danh', {
        tag: 'place',
        defaultValue: 'Hà Nội',
        required: true,
      }),
      createDateField('NGAY_BAN_HANH', 'Ngày ban hành', {
        tag: 'NGAY_BAN_HANH',
        aliases: ['date', 'ngayBanHanh'],
        required: true,
        defaultValue: '2026-09-29',
      }),
      createTextField('TRICH_YEU', 'Về việc', {
        tag: 'TRICH_YEU',
        aliases: ['subject', 'abstract', 'trichYeu'],
        required: true,
        defaultValue: 'Kế hoạch kiểm định kỹ thuật an toàn quý IV năm 2026',
      }),
      createTextareaField('MUC_DICH_YEU_CAU', 'Mục đích, yêu cầu', {
        tag: 'MUC_DICH_YEU_CAU',
        aliases: ['planObjectives', 'mucDichYeuCau'],
        required: true,
        defaultValue:
          '1. Mục đích: Đảm bảo 100% các thiết bị có yêu cầu nghiêm ngặt về an toàn lao động tại các mỏ than hầm lò được kiểm định trước mùa cao điểm sản xuất.\n2. Yêu cầu: Tiến hành kiểm định đúng quy trình, khách quan, chính xác.',
      }),
      createTextareaField('NOI_DUNG_KE_HOACH', 'Nội dung kế hoạch', {
        tag: 'NOI_DUNG_KE_HOACH',
        aliases: ['planTasks', 'NOI_DUNG', 'noiDungKeHoach'],
        required: true,
        defaultValue:
          'Tập trung kiểm định 3 nhóm thiết bị chính: (1) Tời trục mỏ giếng nghiêng và giếng đứng; (2) Trạm biến áp phòng nổ mỏ; (3) Hệ thống quạt gió thông gió chính.',
      }),
      createTextareaField('TIEN_DO', 'Tiến độ thực hiện', {
        tag: 'TIEN_DO',
        aliases: ['planSchedule', 'tienDo'],
        required: true,
        defaultValue: 'Từ ngày 01/10/2026 đến ngày 25/12/2026.',
      }),
      createTextareaField('TO_CHUC_THUC_HIEN', 'Tổ chức thực hiện', {
        tag: 'TO_CHUC_THUC_HIEN',
        aliases: ['planImplementation', 'toChucThucHien'],
        required: true,
        defaultValue:
          'Phòng Kỹ thuật kiểm định phân công 03 tổ công tác hiện trường, chịu trách nhiệm trước Giám đốc về chất lượng và tiến độ kiểm định.',
      }),
      createTextField('signerRole', 'Chức vụ người ký', {
        tag: 'signerRole',
        aliases: ['signerRole', 'chucVuNguoiKy'],
        defaultValue: 'GIÁM ĐỐC TRUNG TÂM',
        required: true,
      }),
      createTextField('NGUOI_KY', 'Người ký', {
        tag: 'NGUOI_KY',
        aliases: ['signerName', 'nguoiKy'],
        required: true,
        defaultValue: 'Nguyễn Văn An',
      }),
      createRepeatableField('NOI_NHAN', 'Nơi nhận', {
        tag: 'NOI_NHAN',
        aliases: ['recipients', 'noiNhan'],
        required: false,
        defaultValue: ['- Viện trưởng (để b/c);', '- Các phòng chuyên môn;', '- Lưu: VT, KH.'],
      }),
    ],
  },
  {
    id: 'hop_dong',
    name: 'Hợp đồng',
    category: 'noi_bo',
    defaultProfile: 'ND30_TVCI',
    description: 'Hợp đồng dịch vụ thử nghiệm, kiểm định an toàn công nghiệp',
    aliases: ['HOP_DONG', 'Hợp đồng', 'hopdong'],
    fields: [
      createTextField('SO_KY_HIEU', 'Số hợp đồng', {
        tag: 'SO_KY_HIEU',
        aliases: ['contractNumber', 'documentNumber', 'soHopDong'],
        required: true,
        defaultValue: '01/2026/HĐKT-TVCI',
        placeholder: '01/2026/HĐKT-TVCI',
      }),
      createTextField('TRICH_YEU', 'Về việc', {
        tag: 'TRICH_YEU',
        aliases: ['subject', 'abstract', 'trichYeu'],
        required: true,
        defaultValue: 'Hợp đồng cung cấp dịch vụ kiểm định kỹ thuật an toàn thiết bị mỏ than',
      }),
      createTextField('place', 'Địa danh lập hợp đồng', {
        tag: 'place',
        defaultValue: 'Hà Nội',
        required: true,
      }),
      createDateField('NGAY_BAN_HANH', 'Ngày ký hợp đồng', {
        tag: 'NGAY_BAN_HANH',
        aliases: ['date', 'ngayBanHanh'],
        required: true,
        defaultValue: '2026-09-29',
      }),
      createTextareaField('BEN_A', 'Thông tin Bên A (Bên giao việc)', {
        tag: 'BEN_A',
        aliases: ['partyA', 'benA'],
        required: true,
        defaultValue:
          'CÔNG TY THAN VÀNG DANH - VINACOMIN\nĐịa chỉ: Thành phố Uông Bí, Tỉnh Quảng Ninh\nĐại diện: Ông Phạm Văn Nam - Chức vụ: Giám đốc',
      }),
      createTextareaField('BEN_B', 'Thông tin Bên B (Bên thực hiện)', {
        tag: 'BEN_B',
        aliases: ['partyB', 'benB'],
        required: true,
        defaultValue:
          'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP (TVCI)\nĐịa chỉ: Tầng 3, Số 54 Hai Bà Trưng, Hoàn Kiếm, Hà Nội\nĐại diện: Ông Nguyễn Văn An - Chức vụ: Giám đốc',
      }),
      createTextareaField('DOI_TUONG_HOP_DONG', 'Nội dung dịch vụ', {
        tag: 'DOI_TUONG_HOP_DONG',
        aliases: ['contractSubject', 'NOI_DUNG', 'noiDungHopDong'],
        required: true,
        defaultValue:
          'Bên A đồng ý giao và Bên B đồng ý nhận thực hiện kiểm định kỹ thuật an toàn đối với 04 hệ thống tời trục mỏ giếng nghiêng theo đúng tiêu chuẩn hiện hành.',
      }),
      createTextField('GIA_TRI_HOP_DONG', 'Giá trị hợp đồng', {
        tag: 'GIA_TRI_HOP_DONG',
        aliases: ['contractValue', 'giaTriHopDong'],
        required: true,
        defaultValue: '180.000.000 VNĐ (Một trăm tám mươi triệu đồng chẵn)',
      }),
      createTextField('THOI_HAN_THUC_HIEN', 'Thời hạn thực hiện', {
        tag: 'THOI_HAN_THUC_HIEN',
        aliases: ['contractDuration', 'thoiHanThucHien'],
        required: true,
        defaultValue: '30 ngày kể từ ngày ký hợp đồng.',
      }),
      createTextField('DAI_DIEN_BEN_A', 'Đại diện Bên A ký', {
        tag: 'DAI_DIEN_BEN_A',
        aliases: ['signerA', 'daiDienBenA'],
        required: true,
        defaultValue: 'Phạm Văn Nam',
      }),
      createTextField('DAI_DIEN_BEN_B', 'Đại diện Bên B ký', {
        tag: 'DAI_DIEN_BEN_B',
        aliases: ['signerB', 'daiDienBenB', 'NGUOI_KY', 'signerName'],
        required: true,
        defaultValue: 'Nguyễn Văn An',
      }),
    ],
  },
];

/** Additional internal schemas (thu_moi, don_nghi_phep) */
export const INTERNAL_SCHEMAS: DocumentFormSchema[] = [
  {
    id: 'thu_moi',
    name: 'Thư mời',
    category: 'noi_bo',
    defaultProfile: 'IEMM',
    description: 'Thư mời dự họp, hội nghị khách hàng',
    aliases: ['THU_MOI', 'Thư mời', 'thumoi'],
    fields: [
      createTextField('KINH_GUI', 'Kính gửi', {
        tag: 'KINH_GUI',
        aliases: ['directRecipients', 'kinhGui'],
        required: true,
        defaultValue: 'Ban Giám đốc Quý Công ty',
      }),
      createTextField('LY_DO', 'Lý do mời', {
        tag: 'LY_DO',
        aliases: ['reason', 'subject', 'TRICH_YEU'],
        required: true,
        defaultValue: 'Dự Hội nghị khách hàng và tổng kết công tác an toàn kỹ thuật năm 2026',
      }),
      createTextareaField('THOI_GIAN_DIA_DIEM', 'Thời gian, địa điểm', {
        tag: 'THOI_GIAN_DIA_DIEM',
        aliases: ['timeAndLocation', 'thoiGianDiaDiem'],
        required: true,
        defaultValue: '08h30 ngày 02 tháng 10 năm 2026 tại Khách sạn Mường Thanh, Bãi Cháy, Quảng Ninh.',
      }),
      createTextField('NGUOI_KY', 'Người ký', {
        tag: 'NGUOI_KY',
        aliases: ['signerName', 'nguoiKy'],
        required: false,
        defaultValue: 'Nguyễn Văn An',
      }),
    ],
  },
  {
    id: 'don_nghi_phep',
    name: 'Đơn nghỉ phép',
    category: 'noi_bo',
    defaultProfile: 'ND30_TVCI',
    description: 'Đơn xin nghỉ phép năm, việc riêng của cán bộ nhân viên',
    aliases: ['DON_NGHI_PHEP', 'Đơn nghỉ phép', 'donnghiphep'],
    fields: [
      createTextField('HO_TEN', 'Họ và tên', {
        tag: 'HO_TEN',
        aliases: ['fullName', 'hoTen'],
        required: true,
        defaultValue: 'Lê Thị Mai',
      }),
      createTextField('CHUC_VU', 'Chức vụ / Đơn vị', {
        tag: 'CHUC_VU',
        aliases: ['position', 'chucVu'],
        required: true,
        defaultValue: 'Chuyên viên Phòng Kế hoạch',
      }),
      createTextField('SO_NGAY_NGHI', 'Số ngày nghỉ', {
        tag: 'SO_NGAY_NGHI',
        aliases: ['daysCount', 'soNgayNghi'],
        required: true,
        defaultValue: '03 ngày',
      }),
      createDateField('TU_NGAY', 'Nghỉ từ ngày', {
        tag: 'TU_NGAY',
        aliases: ['startDate', 'tuNgay'],
        required: false,
        defaultValue: '2026-10-05',
      }),
      createDateField('DEN_NGAY', 'Nghỉ đến ngày', {
        tag: 'DEN_NGAY',
        aliases: ['endDate', 'denNgay'],
        required: false,
        defaultValue: '2026-10-07',
      }),
      createTextareaField('LY_DO', 'Lý do xin nghỉ', {
        tag: 'LY_DO',
        aliases: ['reason', 'lyDo'],
        required: true,
        defaultValue: 'Giải quyết công việc riêng của gia đình.',
      }),
    ],
  },
];

/** Complete list of all registered schemas */
export const ALL_SCHEMAS: DocumentFormSchema[] = [...FORM_SCHEMAS, ...INTERNAL_SCHEMAS];

/** Compatibility alias */
export const CANONICAL_SCHEMAS = ALL_SCHEMAS;

/** Resolves schema by ID, alias, or Vietnamese title (case-insensitive) */
export function getFormSchema(typeOrId: string): DocumentFormSchema | undefined {
  if (!typeOrId) return undefined;
  const query = typeOrId.trim().toLowerCase();

  return ALL_SCHEMAS.find(
    (s) =>
      s.id.toLowerCase() === query ||
      s.name.toLowerCase() === query ||
      s.aliases?.some((a) => a.toLowerCase() === query)
  );
}

/** Strict getter that throws if schema not found (matches E2E tier 2 boundary expectation) */
export function getTemplateFormSchemaByDocumentType(documentType: string): DocumentFormSchema {
  const found = getFormSchema(documentType);
  if (!found) {
    throw new Error(`Mẫu biểu không tồn tại trong hệ thống: ${documentType}`);
  }
  return found;
}

/**
 * Returns default values object for a schema with dual keys populated
 */
export function getDefaultValuesForSchema(typeOrId: string): TemplateFormValues {
  const schema = getFormSchema(typeOrId);
  if (!schema) return {};

  const values: TemplateFormValues = {};

  for (const field of schema.fields) {
    const defaultVal = field.defaultValue ?? (field.type === 'repeatable' ? [] : '');
    values[field.id] = defaultVal;

    if (field.tag && field.tag !== field.id) {
      values[field.tag] = defaultVal;
    }

    if (field.aliases) {
      for (const alias of field.aliases) {
        if (!(alias in values)) {
          values[alias] = defaultVal;
        }
      }
    }
  }

  return values;
}
