/**
 * TVCI Administrative Template Catalog (22 templates)
 * Conforming to Nghị định 30/2020/NĐ-CP & Corporate Profiles (TVCI, IEMM, TKV, DANG).
 */

import type {
  AdministrativeTemplate,
  TemplateCategory,
  TemplateOrganization,
} from './types';

export function normalizeVietnamese(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

const RUNTIME_SHA256_BY_FILE_NAME: Record<string, string> = {
  'tvci-cong-van-template.docx': '29bcd69b4cadeabcdeb7495507a1c382ff6a96086ed43114d1d034704e705fa1',
  'tvci-thong-bao-template.docx': 'b53c35525ee2dd66b416143426adc556a2f61577ae3d0fb0ae17b0322a996c45',
  'tkv-quyet-dinh-template.docx': '6943a9b69b13a4b813e76d6d6a601dfc450e8732c1644c461880348d067ef73d',
  'dang-sample.docx': '1abd2abe6a8912f07af4f4788be039ee107efd2e13758eb022e0726a9ea78f5e',
  'iemm-to-trinh-noi-bo-template.docx': 'd403ca491efdcc4aa0bba39c7cda457d6e62dc72c8276d426675817a01625338',
  'iemm-don-xin-nghi-phep-template.docx': 'ecec4bdbd864cf0756d7ab7ec072f8e354c7878f041219be82cc80149fccfe1d',
  'iemm-thu-moi-template.docx': '8c565c85deac2c38cd06878ab2cefc6256eebc00ab35d4b510495fadd73de933',
  'tvci-sample.docx': 'aac92663d74536c7534d2f7970b69bfc5275d4b823244963256c70c3da7f9a5a',
};

const QUARANTINED_SAMPLE_IDS = new Set(['dang-sample', 'tvci-sample']);

function verificationFor(template: Omit<AdministrativeTemplate, 'verification'>): AdministrativeTemplate['verification'] {
  const status = QUARANTINED_SAMPLE_IDS.has(template.id) ? 'quarantined' : 'unverified';
  const runtimePath = `/templates/${template.fileName}`;
  const runtimeSha256 = RUNTIME_SHA256_BY_FILE_NAME[template.fileName] ?? null;
  return {
    status,
    reason: status === 'quarantined'
      ? 'Generic/sample DOCX retained for audit only; no official canonical DOCX is present.'
      : runtimeSha256
        ? 'No exact official canonical DOCX is present. Generated catalog metadata and reference titles do not prove the approved form.'
        : `Declared runtime DOCX path ${runtimePath} is not present; no canonical source is available.`,
    canonicalSource: null,
    runtime: { path: runtimePath, sha256: runtimeSha256 },
  };
}

const CATALOG_RECORDS: Omit<AdministrativeTemplate, 'verification'>[] = [
  {
    id: 'tvci-cv',
    name: 'Công văn TVCI chuẩn',
    title: 'Công văn TVCI chuẩn',
    category: 'cong_van',
    vietnameseCategory: 'Công văn',
    organization: 'TVCI',
    fileName: 'tvci-cong-van-template.docx',
    description: 'Mẫu công văn hành chính TVCI chuẩn theo Nghị định 30/2020/NĐ-CP gửi khách hàng và đối tác.',
    schemaId: 'cong_van',
    defaultProfile: 'ND30_TVCI',
    keywords: ['công văn', 'cong van', 'tvci', 'hành chính', 'gửi đối tác'],
    headerSetup: {
      agencyUpper: 'TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM',
      agencyLower: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      agencyDepartment: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      documentSymbolPrefix: 'Số: …/TVCI-VP',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: [
        '- Như trên;',
        '- Tổng Giám đốc Tập đoàn (để b/c);',
        '- Viện trưởng (để b/c);',
        '- Lưu: VT, TTTN.',
      ],
      signerPosition: 'GIÁM ĐỐC TRUNG TÂM',
      signerName: 'Nguyễn Văn An',
    },
    initialBodyParagraphs: [
      'Kính gửi: Các đơn vị thành viên Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam.',
      'Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư;',
      'Căn cứ chức năng, nhiệm vụ của Trung tâm Thử nghiệm - Kiểm định Công nghiệp (TVCI) trong công tác kiểm định kỹ thuật an toàn hệ thống thiết bị mỏ than hầm lò;',
      'Nhằm đảm bảo an toàn tuyệt đối cho người lao động và thiết bị trong quá trình sản xuất, Trung tâm Thử nghiệm - Kiểm định Công nghiệp đề nghị các đơn vị phối hợp triển khai kiểm định định kỳ theo đúng tiến độ kế hoạch.',
      'Kính đề nghị các đơn vị lập kế hoạch chi tiết và gửi văn bản đăng ký về Trung tâm trước ngày quy định./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'tvci-tb',
    name: 'Thông báo TVCI chuẩn',
    title: 'Thông báo TVCI chuẩn',
    category: 'thong_bao',
    vietnameseCategory: 'Thông báo',
    organization: 'TVCI',
    fileName: 'tvci-thong-bao-template.docx',
    description: 'Thông báo nội bộ TVCI về kế hoạch công tác, lịch kiểm định kỹ thuật và điều hành sản xuất.',
    schemaId: 'thong_bao',
    defaultProfile: 'ND30_TVCI',
    keywords: ['thông báo', 'thong bao', 'tvci', 'kế hoạch', 'nội bộ'],
    headerSetup: {
      agencyUpper: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      agencyLower: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      documentSymbolPrefix: 'Số: …/TB-TVCI',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Như trên;', '- Các phòng chuyên môn;', '- Lưu: VT, VP.'],
      signerPosition: 'KT. GIÁM ĐỐC\nPHÓ GIÁM ĐỐC',
      signerName: 'Trần Văn Bình',
    },
    initialBodyParagraphs: [
      'Thực hiện kế hoạch công tác kiểm định an toàn quý III năm 2026, Trung tâm Thử nghiệm - Kiểm định Công nghiệp thông báo tới toàn thể cán bộ, kỹ sư và các phòng ban liên quan:',
      '1. Về tiến độ kiểm định thiết bị mỏ than: Yêu cầu các phòng kỹ thuật hoàn thành 100% hồ sơ nghiệm thu kỹ thuật theo đúng thời hạn quy định.',
      '2. Về công tác trực an toàn hiện trường: Đảm bảo đầy đủ trang thiết bị đo kiểm và phương tiện bảo hộ lao động đạt chuẩn.',
      'Thông báo này được phổ biến rộng rãi tới tất cả cán bộ nhân viên để nghiêm túc thực hiện./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'tkv-qd',
    name: 'Quyết định Tập đoàn TKV',
    title: 'Quyết định Tập đoàn TKV',
    category: 'quyet_dinh',
    vietnameseCategory: 'Quyết định',
    organization: 'TKV',
    fileName: 'tkv-quyet-dinh-template.docx',
    description: 'Mẫu quyết định quản trị và điều hành cấp Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam.',
    schemaId: 'quyet_dinh',
    defaultProfile: 'TKV',
    keywords: ['quyết định', 'quyet dinh', 'tkv', 'tập đoàn', 'ban hành'],
    headerSetup: {
      agencyUpper: 'ỦY BAN QUẢN LÝ VỐN NHÀ NƯỚC TẠI DOANH NGHIỆP',
      agencyLower: 'TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM',
      documentSymbolPrefix: 'Số: …/QĐ-TKV',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: [
        '- Hội đồng thành viên (để b/c);',
        '- Tổng Giám đốc Tập đoàn;',
        '- Các Phó Tổng Giám đốc;',
        '- Các Ban chuyên môn;',
        '- Lưu: VT, TCHC.',
      ],
      signerPosition: 'TỔNG GIÁM ĐỐC',
      signerName: 'Lê Minh Tuấn',
    },
    initialBodyParagraphs: [
      'Căn cứ Điều lệ tổ chức và hoạt động của Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam ban hành kèm theo Nghị định số 105/2018/NĐ-CP của Chính phủ;',
      'Căn cứ Nghị quyết của Hội đồng thành viên Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam;',
      'Xét đề nghị của Trưởng Ban Tổ chức Nhân sự Tập đoàn,',
      'Điều 1. Phê duyệt chương trình kiểm tra kỹ thuật an toàn toàn diện tại các đơn vị thành viên khối sản xuất than hầm lò năm 2026.',
      'Điều 2. Giao Viện Cơ khí Năng lượng và Mỏ - Vinacomin (Trung tâm TVCI) chủ trì thực hiện công tác thử nghiệm, kiểm định an toàn theo đúng tiêu chuẩn kỹ thuật hiện hành.',
      'Điều 3. Chánh Văn phòng, Trưởng các Ban chuyên môn Tập đoàn và Thủ trưởng các đơn vị liên quan chịu trách nhiệm thi hành Quyết định này./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'dang-sample',
    name: 'Văn bản mẫu Ban Đảng',
    title: 'Văn bản mẫu Ban Đảng',
    category: 'cong_van',
    vietnameseCategory: 'Công văn Đảng',
    organization: 'DANG',
    fileName: 'dang-sample.docx',
    description: 'Mẫu công văn, hướng dẫn của Đảng ủy Tập đoàn và Đảng bộ cơ sở theo Hướng dẫn 05-HD/VPTW.',
    schemaId: 'cong_van',
    defaultProfile: 'DANG_05_HD_VPTW_2026',
    keywords: ['đảng', 'dang', 'chi bộ', 'hướng dẫn', 'nghị quyết đảng'],
    headerSetup: {
      agencyUpper: 'ĐẢNG CỘNG SẢN VIỆT NAM',
      agencyLower: 'ĐẢNG ỦY TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM',
      agencyDepartment: 'ĐẢNG ỦY VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ',
      documentSymbolPrefix: 'Số: …-CV/ĐU',
      mottoUpper: 'ĐẢNG CỘNG SẢN VIỆT NAM',
      mottoLower: 'Đoàn kết - Tiên phong - Đổi mới',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: [
        '- Ban Thường vụ Đảng ủy Tập đoàn (để b/c);',
        '- Các Chi bộ trực thuộc;',
        '- Các đồng chí Đảng ủy viên;',
        '- Lưu: Văn phòng Đảng ủy.',
      ],
      signerPosition: 'T/M ĐẢNG ỦY\nBÍ THƯ',
      signerName: 'Vũ Đức Thành',
    },
    initialBodyParagraphs: [
      'Kính gửi: Các Chi bộ trực thuộc Đảng bộ Viện Cơ khí Năng lượng và Mỏ.',
      'Thực hiện Hướng dẫn số 05-HD/VPTW ngày 27/05/2026 của Văn phòng Trung ương Đảng về thể thức và kỹ thuật trình bày văn bản của Đảng;',
      'Đảng ủy Viện yêu cầu các Chi bộ trực thuộc triển khai sinh hoạt chuyên đề về nâng cao năng lực lãnh đạo và thực hiện nghiêm túc quy chế làm việc;',
      'Báo cáo kết quả sinh hoạt chuyên đề gửi về Văn phòng Đảng ủy trước ngày 15 hàng tháng để tổng hợp báo cáo Đảng bộ cấp trên./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-01',
    name: 'Quyết định cá biệt',
    title: 'Quyết định cá biệt',
    category: 'quyet_dinh',
    vietnameseCategory: 'Quyết định',
    organization: 'IEMM',
    fileName: '01-quyet-dinh-ca-biet.docx',
    description: 'Quyết định cá biệt Viện IEMM áp dụng cho công tác nhân sự, bổ nhiệm, khen thưởng cán bộ kỹ thuật.',
    schemaId: 'quyet_dinh',
    defaultProfile: 'IEMM',
    keywords: ['quyết định cá biệt', 'iemm-01', 'bổ nhiệm', 'khen thưởng', 'nhân sự'],
    headerSetup: {
      agencyUpper: 'TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM',
      agencyLower: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      documentSymbolPrefix: 'Số: …/QĐ-VCNM',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Như Điều 3;', '- Lãnh đạo Viện;', '- Các Phòng, Trung tâm;', '- Lưu: VT, TCCB.'],
      signerPosition: 'VIỆN TRƯỞNG',
      signerName: 'TS. Nguyễn Văn Hùng',
    },
    initialBodyParagraphs: [
      'Căn cứ Quyết định số 731/QĐ-VCNM ngày 15/4/2022 của Viện trưởng Viện Cơ khí Năng lượng và Mỏ về việc ban hành Quy chế tổ chức và hoạt động của Viện;',
      'Xét đề nghị của Trưởng phòng Tổ chức Cán bộ và Giám đốc Trung tâm Thử nghiệm - Kiểm định Công nghiệp,',
      'Điều 1. Thành lập Hội đồng nghiệm thu cấp cơ sở đánh giá chất lượng hệ thống kiểm định thiết bị mỏ than năm 2026.',
      'Điều 2. Hội đồng có nhiệm vụ tổ chức kiểm tra, đánh giá quy chuẩn kỹ thuật và báo cáo Viện trưởng xem xét phê duyệt.',
      'Điều 3. Các ông (bà) có tên tại Điều 1 và các đơn vị trực thuộc chịu trách nhiệm thi hành Quyết định này./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-02',
    name: 'Quyết định quy định',
    title: 'Quyết định quy định',
    category: 'quyet_dinh',
    vietnameseCategory: 'Quyết định',
    organization: 'IEMM',
    fileName: '02-quyet-dinh-quy-dinh.docx',
    description: 'Quyết định ban hành văn bản, quy chế, quy định kỹ thuật và an toàn nội bộ Viện IEMM.',
    schemaId: 'quyet_dinh',
    defaultProfile: 'IEMM',
    keywords: ['quy định', 'quy chế', 'ban hành văn bản', 'iemm', 'tiêu chuẩn'],
    headerSetup: {
      agencyUpper: 'TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM',
      agencyLower: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      documentSymbolPrefix: 'Số: …/QĐ-VCNM',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Như Điều 3;', '- Tập đoàn TKV (để b/c);', '- Lưu: VT, KHCN.'],
      signerPosition: 'VIỆN TRƯỞNG',
      signerName: 'TS. Nguyễn Văn Hùng',
    },
    initialBodyParagraphs: [
      'Căn cứ Luật Tiêu chuẩn và Quy chuẩn kỹ thuật ngày 29 tháng 6 năm 2006;',
      'Căn cứ Quy chế tổ chức và hoạt động của Viện Cơ khí Năng lượng và Mỏ - Vinacomin;',
      'Điều 1. Ban hành kèm theo Quyết định này Quy trình kiểm tra, thử nghiệm độ bền chịu áp của thiết bị phòng nổ sử dụng trong hầm lò.',
      'Điều 2. Quyết định này có hiệu lực thi hành kể từ ngày ký.',
      'Điều 3. Trưởng phòng Quản lý Khoa học, Giám đốc TVCI và các đơn vị thành viên chịu trách nhiệm thi hành Quyết định này./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-03',
    name: 'Công văn hành chính',
    title: 'Công văn hành chính',
    category: 'cong_van',
    vietnameseCategory: 'Công văn',
    organization: 'IEMM',
    fileName: '03-cong-van.docx',
    description: 'Mẫu công văn hành chính chính thức của Viện IEMM trao đổi với các Bộ ngành và Tập đoàn.',
    schemaId: 'cong_van',
    defaultProfile: 'IEMM',
    keywords: ['công văn hành chính', 'iemm', 'giao dịch', 'văn bản đến đi'],
    headerSetup: {
      agencyUpper: 'TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM',
      agencyLower: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      documentSymbolPrefix: 'Số: …/VCNM-VP',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Như trên;', '- Lãnh đạo Viện;', '- Lưu: VT, VP.'],
      signerPosition: 'KT. VIỆN TRƯỞNG\nPHÓ VIỆN TRƯỞNG',
      signerName: 'Đặng Thanh Hà',
    },
    initialBodyParagraphs: [
      'Kính gửi: Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam.',
      'Viện Cơ khí Năng lượng và Mỏ xin trân trọng gửi lời chào hợp tác.',
      'Thực hiện chỉ đạo của Tập đoàn về việc rà soát quy chuẩn an toàn mỏ, Viện đã tiến hành kiểm định thực nghiệm và hoàn thiện hồ sơ khoa học.',
      'Kính trình Tập đoàn xem xét và có ý kiến chỉ đạo triển khai giai đoạn tiếp theo./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-04',
    name: 'Tờ trình phê duyệt',
    title: 'Tờ trình phê duyệt',
    category: 'to_trinh',
    vietnameseCategory: 'Tờ trình',
    organization: 'IEMM',
    fileName: '04-to-trinh.docx',
    description: 'Tờ trình của Viện IEMM trình cấp trên phê duyệt đề tài khoa học hoặc kinh phí mua sắm thiết bị kiểm định.',
    schemaId: 'to_trinh',
    defaultProfile: 'IEMM',
    keywords: ['tờ trình', 'phê duyệt', 'iemm', 'đề tài', 'dự án'],
    headerSetup: {
      agencyUpper: 'TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM',
      agencyLower: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      documentSymbolPrefix: 'Số: …/TTr-VCNM',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Như kính gửi;', '- Hội đồng KHCN Viện;', '- Lưu: VT, KHĐT.'],
      signerPosition: 'VIỆN TRƯỞNG',
      signerName: 'TS. Nguyễn Văn Hùng',
    },
    initialBodyParagraphs: [
      'Kính gửi: Hội đồng Thành viên Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam.',
      'I. SỰ CẦN THIẾT BAN HÀNH / ĐẦU TƯ:\nHiện nay hệ thống máy thử nghiệm vật liệu chịu nổ của Trung tâm TVCI đã hoạt động trên 10 năm, cần nâng cấp để đáp ứng tiêu chuẩn quốc tế ISO/IEC 17025.',
      'II. NỘI DUNG ĐỀ XUẤT:\nĐầu tư bổ sung module phân tích ứng suất động lực học số hóa và đào tạo chuyển giao công nghệ cho đội ngũ kỹ sư thử nghiệm.',
      'III. KIẾN NGHỊ:\nKính đề nghị Tập đoàn xem xét phê duyệt chủ trương và bố trí nguồn vốn đầu tư theo kế hoạch năm 2026./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-05',
    name: 'Thông báo kết luận',
    title: 'Thông báo kết luận',
    category: 'thong_bao',
    vietnameseCategory: 'Thông báo',
    organization: 'IEMM',
    fileName: '05-thong-bao.docx',
    description: 'Thông báo kết luận cuộc họp giao ban Lãnh đạo Viện với các đơn vị trực thuộc.',
    schemaId: 'thong_bao',
    defaultProfile: 'IEMM',
    keywords: ['kết luận', 'giao ban', 'thông báo', 'lãnh đạo viện'],
    headerSetup: {
      agencyUpper: 'TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM',
      agencyLower: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      documentSymbolPrefix: 'Số: …/TB-VCNM',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Ban Lãnh đạo Viện;', '- Các Phòng ban, Trung tâm;', '- Lưu: VT, VP.'],
      signerPosition: 'CHÁNH VĂN PHÒNG',
      signerName: 'Hoàng Trọng Nghĩa',
    },
    initialBodyParagraphs: [
      'Ngày 25 tháng 9 năm 2026, tại Phòng họp số 1, Viện trưởng đã chủ trì cuộc họp giao ban định kỳ tháng 9.',
      'Sau khi nghe báo cáo tiến độ và ý kiến đóng góp của các đơn vị, Viện trưởng kết luận như sau:',
      '1. Về tiến độ các đề tài nghiên cứu KHCN: Yêu cầu các chủ nhiệm đề tài hoàn thành đúng hạn hồ sơ đánh giá cơ sở.',
      '2. Về kế hoạch tài chính: Đẩy nhanh công tác quyết toán các hợp đồng dịch vụ thử nghiệm công nghiệp đã hoàn thành nghiệm thu.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-06',
    name: 'Biên bản cuộc họp',
    title: 'Biên bản cuộc họp',
    category: 'bieu_mau_noi_bo',
    vietnameseCategory: 'Biên bản',
    organization: 'IEMM',
    fileName: '06-bien-ban.docx',
    description: 'Mẫu biên bản cuộc họp giao ban, hội đồng nghiệm thu kỹ thuật nội bộ Viện.',
    schemaId: 'bien_ban',
    defaultProfile: 'IEMM',
    keywords: ['biên bản', 'họp', 'nghiệm thu', 'giao ban'],
    headerSetup: {
      agencyUpper: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      agencyLower: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      documentSymbolPrefix: 'Số: …/BB-TVCI',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Như thành phần;', '- Lưu: Hồ sơ cuộc họp.'],
      signerPosition: 'CHỦ TRÌ CUỘC HỌP',
      signerName: 'Nguyễn Văn An',
    },
    initialBodyParagraphs: [
      'Thời gian: Vào hồi 08 giờ 30 phút, ngày 29 tháng 9 năm 2026.',
      'Địa điểm: Phòng họp tầng 2, Trung tâm Thử nghiệm - Kiểm định Công nghiệp.',
      'Thành phần tham dự: Đại diện Lãnh đạo Viện, Ban Giám đốc TVCI và Trưởng các bộ phận chuyên môn.',
      'Nội dung diễn biến: Hội nghị đã thảo luận phương án kỹ thuật kiểm định tời trục mỏ hầm lò và thống nhất biên bản kết luận.',
      'Cuộc họp kết thúc hồi 11 giờ 30 cùng ngày, biên bản được thông qua 100% đại biểu nhất trí./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-07',
    name: 'Báo cáo công tác',
    title: 'Báo cáo công tác',
    category: 'bieu_mau_noi_bo',
    vietnameseCategory: 'Báo cáo',
    organization: 'IEMM',
    fileName: '07-bao-cao.docx',
    description: 'Mẫu báo cáo công tác định kỳ (tháng, quý, năm) và báo cáo chuyên đề kỹ thuật an toàn.',
    schemaId: 'bao_cao',
    defaultProfile: 'IEMM',
    keywords: ['báo cáo', 'công tác', 'kết quả', 'định kỳ'],
    headerSetup: {
      agencyUpper: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      agencyLower: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      documentSymbolPrefix: 'Số: …/BC-TVCI',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Viện trưởng (để b/c);', '- Các phòng ban;', '- Lưu: VT, TH.'],
      signerPosition: 'GIÁM ĐỐC TRUNG TÂM',
      signerName: 'Nguyễn Văn An',
    },
    initialBodyParagraphs: [
      'Kính gửi: Ban Giám đốc Viện Cơ khí Năng lượng và Mỏ - Vinacomin.',
      'I. TÌNH HÌNH THỰC HIỆN NHIỆM VỤ QUÝ III/2026:\nĐơn vị đã hoàn thành 100% chỉ tiêu kế hoạch kiểm định kỹ thuật an toàn thiết bị mỏ than.',
      'II. KẾT QUẢ ĐẠT ĐƯỢC:\nThực hiện kiểm định 45 lượt tời trục, 12 trạm biến áp phòng nổ, không để xảy ra sự cố kỹ thuật.',
      'III. KIẾN NGHỊ ĐỀ XUẤT:\nĐề nghị Viện hỗ trợ trang bị thêm cảm biến đo độ rung hiện đại để mở rộng phạm vi chứng nhận an toàn./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-08',
    name: 'Kế hoạch hoạt động',
    title: 'Kế hoạch hoạt động',
    category: 'bieu_mau_noi_bo',
    vietnameseCategory: 'Kế hoạch',
    organization: 'IEMM',
    fileName: '08-ke-hoach.docx',
    description: 'Mẫu kế hoạch triển khai công tác nghiên cứu khoa học, thử nghiệm và an toàn lao động.',
    schemaId: 'bao_cao',
    defaultProfile: 'IEMM',
    keywords: ['kế hoạch', 'hoạt động', 'triển khai', 'nhiệm vụ'],
    headerSetup: {
      agencyUpper: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      agencyLower: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      documentSymbolPrefix: 'Số: …/KH-TVCI',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Ban Lãnh đạo Viện;', '- Các tổ công tác;', '- Lưu: VT, KH.'],
      signerPosition: 'GIÁM ĐỐC',
      signerName: 'Nguyễn Văn An',
    },
    initialBodyParagraphs: [
      'I. MỤC ĐÍCH, YÊU CẦU:\nNâng cao chất lượng dịch vụ thử nghiệm công nghiệp và đảm bảo tiến độ cấp chứng nhận an toàn thiết bị mỏ.',
      'II. TIẾN ĐỘ THỰC HIỆN:\nPhân kỳ công tác kiểm tra thực địa từ tháng 10 đến tháng 12 năm 2026.',
      'III. TỔ CHỨC THỰC HIỆN:\nPhòng Kỹ thuật chủ trì phối hợp với các tổ công tác hiện trường để triển khai đồng bộ./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-09',
    name: 'Chương trình công tác',
    title: 'Chương trình công tác',
    category: 'bieu_mau_noi_bo',
    vietnameseCategory: 'Chương trình',
    organization: 'IEMM',
    fileName: '09-chuong-trinh.docx',
    description: 'Chương trình phối hợp công tác khoa học kỹ thuật giữa Viện IEMM và các đơn vị bạn.',
    schemaId: 'bao_cao',
    defaultProfile: 'IEMM',
    keywords: ['chương trình', 'công tác', 'phối hợp', 'hợp tác'],
    headerSetup: {
      agencyUpper: 'TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM',
      agencyLower: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      documentSymbolPrefix: 'Số: …/CTr-VCNM',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Các đơn vị tham gia;', '- Lưu: VT, HĐ.'],
      signerPosition: 'VIỆN TRƯỞNG',
      signerName: 'TS. Nguyễn Văn Hùng',
    },
    initialBodyParagraphs: [
      'CHƯƠNG TRÌNH PHỐI HỢP CÔNG TÁC NGHIÊN CỨU VÀ PHÁT TRIỂN CÔNG NGHỆ KHAI THÁC MỎ',
      '1. Mục tiêu chương trình: Xây dựng giải pháp kỹ thuật nâng cao hiệu suất bóc xúc đất đá và an toàn khai thác.',
      '2. Các giai đoạn triển khai: Khảo sát thực địa, phân tích số liệu, thử nghiệm mô hình tại phòng thí nghiệm.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-10',
    name: 'Giấy mời dự họp',
    title: 'Giấy mời dự họp',
    category: 'bieu_mau_noi_bo',
    vietnameseCategory: 'Giấy mời',
    organization: 'IEMM',
    fileName: '10-giay-moi.docx',
    description: 'Mẫu giấy mời dự họp nghiệm thu, hội thảo khoa học và đánh giá chuyên đề kỹ thuật.',
    schemaId: 'thu_moi',
    defaultProfile: 'IEMM',
    keywords: ['giấy mời', 'họp', 'hội thảo', 'nghiệm thu'],
    headerSetup: {
      agencyUpper: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      agencyLower: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      documentSymbolPrefix: 'Số: …/GM-TVCI',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Như kính mời;', '- Lưu: VT.'],
      signerPosition: 'GIÁM ĐỐC',
      signerName: 'Nguyễn Văn An',
    },
    initialBodyParagraphs: [
      'Trung tâm Thử nghiệm - Kiểm định Công nghiệp trân trọng kính mời:',
      'Đại diện Quý đơn vị tham dự cuộc họp đánh giá kết quả nghiệm thu kỹ thuật an toàn tời trục mỏ than hầm lò.',
      'Thời gian: 09 giờ 00, Thứ Sáu ngày 02 tháng 10 năm 2026.',
      'Địa điểm: Phòng Hội thảo số 2, Viện Cơ khí Năng lượng và Mỏ, Hà Nội.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-11',
    name: 'Giấy giới thiệu',
    title: 'Giấy giới thiệu',
    category: 'bieu_mau_noi_bo',
    vietnameseCategory: 'Giấy giới thiệu',
    organization: 'IEMM',
    fileName: '11-giay-gioi-thieu.docx',
    description: 'Giấy giới thiệu cán bộ kỹ thuật và chuyên viên đến công tác, thử nghiệm tại hiện trường mỏ.',
    schemaId: 'cong_van',
    defaultProfile: 'IEMM',
    keywords: ['giấy giới thiệu', 'công tác', 'hiện trường', 'liên hệ'],
    headerSetup: {
      agencyUpper: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      agencyLower: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      documentSymbolPrefix: 'Số: …/GGT-TVCI',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Như kính gửi;', '- Lưu: VT, TCHC.'],
      signerPosition: 'GIÁM ĐỐC',
      signerName: 'Nguyễn Văn An',
    },
    initialBodyParagraphs: [
      'Trân trọng giới thiệu: Ông Nguyễn Văn Long, Chức vụ: Kỹ sư trưởng kiểm định.',
      'Được cử đến liên hệ công tác tại: Công ty Than Vàng Danh - Vinacomin.',
      'Nội dung: Phối hợp kiểm định kỹ thuật an toàn hệ thống thông gió chính và thiết bị điện phòng nổ.',
      'Giấy giới thiệu có giá trị đến hết ngày 30 tháng 10 năm 2026./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-12',
    name: 'Giấy nghỉ phép',
    title: 'Giấy nghỉ phép',
    category: 'bieu_mau_noi_bo',
    vietnameseCategory: 'Nghỉ phép',
    organization: 'IEMM',
    fileName: '12-giay-nghi-phep.docx',
    description: 'Mẫu giấy xác nhận giải quyết nghỉ phép thường niên hoặc việc riêng cho cán bộ công nhân viên.',
    schemaId: 'don_nghi_phep',
    defaultProfile: 'IEMM',
    keywords: ['giấy nghỉ phép', 'nghỉ phép', 'phép năm', 'cán bộ'],
    headerSetup: {
      agencyUpper: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      agencyLower: 'PHÒNG TỔ CHỨC CÁN BỘ',
      documentSymbolPrefix: 'Số: …/GNP-TCCB',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Người nghỉ phép;', '- Phòng Kế toán;', '- Lưu: TCCB.'],
      signerPosition: 'TRƯỞNG PHÒNG TCCB',
      signerName: 'Trần Văn Hòa',
    },
    initialBodyParagraphs: [
      'Căn cứ Bộ luật Lao động và Quy chế làm việc của Viện;',
      'Chứng nhận Ông/Bà: Lê Thị Mai, Chuyên viên phòng Kế hoạch.',
      'Được nghỉ phép năm từ ngày 05/10/2026 đến hết ngày 09/10/2026 (05 ngày làm việc).',
      'Nơi nghỉ phép: Tỉnh Quảng Ninh. Đã bàn giao công việc cho đồng nghiệp phụ trách./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-13',
    name: 'Bản cam kết',
    title: 'Bản cam kết',
    category: 'bieu_mau_noi_bo',
    vietnameseCategory: 'Cam kết',
    organization: 'IEMM',
    fileName: '13-ban-cam-ket.docx',
    description: 'Bản cam kết an toàn lao động, bảo mật bí mật công nghệ và bảo vệ dữ liệu khách hàng.',
    schemaId: 'cong_van',
    defaultProfile: 'IEMM',
    keywords: ['cam kết', 'an toàn', 'bảo mật', 'lao động'],
    headerSetup: {
      agencyUpper: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      agencyLower: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      documentSymbolPrefix: 'Số: …/CK-TVCI',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Lãnh đạo đơn vị;', '- Người cam kết;', '- Lưu: HS.'],
      signerPosition: 'NGƯỜI LÀM CAM KẾT',
      signerName: 'Kỹ sư kiểm định',
    },
    initialBodyParagraphs: [
      'Tôi tên là: Phạm Quốc Hưng, Kỹ sư an toàn lao động tại Trung tâm TVCI.',
      'Tôi xin cam kết tuân thủ nghiêm ngặt mọi quy định về an toàn kỹ thuật phòng chống cháy nổ mỏ than;',
      'Bảo quản đầy đủ trang thiết bị thử nghiệm được giao và chịu trách nhiệm trước pháp luật nếu vi phạm./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-14',
    name: 'Công văn đính chính',
    title: 'Công văn đính chính',
    category: 'cong_van',
    vietnameseCategory: 'Công văn',
    organization: 'IEMM',
    fileName: '14-cong-van-dinh-chinh.docx',
    description: 'Mẫu công văn đính chính sai sót kỹ thuật hoặc số liệu trong văn bản đã ban hành.',
    schemaId: 'cong_van',
    defaultProfile: 'IEMM',
    keywords: ['đính chính', 'công văn đính chính', 'sửa lỗi văn bản'],
    headerSetup: {
      agencyUpper: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      agencyLower: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      documentSymbolPrefix: 'Số: …/ĐC-TVCI',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Như văn bản gốc;', '- Lưu: VT, TTTN.'],
      signerPosition: 'GIÁM ĐỐC',
      signerName: 'Nguyễn Văn An',
    },
    initialBodyParagraphs: [
      'Kính gửi: Các cơ quan, đơn vị nhận văn bản số 125/VCNM-TTTN ngày 09/9/2026.',
      'Do sơ suất kỹ thuật trong khâu chế bản, Trung tâm xin đính chính một số chi tiết tại mục 2 như sau:',
      'Đã ghi: "thời hạn hoàn thành ngày 15/9/2026". Nay đính chính thành: "thời hạn hoàn thành ngày 25/9/2026".',
      'Các nội dung khác trong văn bản giữ nguyên giá trị thi hành./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-tt-nb',
    name: 'Tờ trình nội bộ',
    title: 'Tờ trình nội bộ',
    category: 'to_trinh',
    vietnameseCategory: 'Tờ trình',
    organization: 'IEMM',
    fileName: 'iemm-to-trinh-noi-bo-template.docx',
    description: 'Tờ trình từ Trung tâm TVCI hoặc phòng ban trực thuộc trình Viện trưởng giải quyết công việc nội bộ.',
    schemaId: 'to_trinh',
    defaultProfile: 'IEMM',
    keywords: ['tờ trình nội bộ', 'trình viện trưởng', 'đề xuất', 'mua sắm'],
    headerSetup: {
      agencyUpper: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      agencyLower: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      documentSymbolPrefix: 'Số: …/TTr-TTTN',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Như kính gửi;', '- Lưu: VT, TVCI.'],
      signerPosition: 'GIÁM ĐỐC TRUNG TÂM',
      signerName: 'Nguyễn Văn An',
    },
    initialBodyParagraphs: [
      'Kính gửi: Viện trưởng Viện Cơ khí Năng lượng và Mỏ - Vinacomin.',
      'I. SỰ CẦN THIẾT:\nĐể phục vụ công tác kiểm định hệ thống điện phòng nổ tại Quảng Ninh, Trung tâm cần bổ sung bộ dụng cụ đo điện trở cách điện cao áp.',
      'II. ĐỀ XUẤT:\nKính đề nghị Viện trưởng xem xét phê duyệt kinh phí mua sắm thiết bị từ nguồn quỹ phát triển hoạt động sự nghiệp.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-don-np',
    name: 'Đơn xin nghỉ phép',
    title: 'Đơn xin nghỉ phép',
    category: 'bieu_mau_noi_bo',
    vietnameseCategory: 'Nghỉ phép',
    organization: 'IEMM',
    fileName: 'iemm-don-xin-nghi-phep-template.docx',
    description: 'Mẫu đơn xin nghỉ phép năm, nghỉ chế độ hoặc việc riêng của cán bộ nhân viên.',
    schemaId: 'don_nghi_phep',
    defaultProfile: 'ND30_TVCI',
    keywords: ['đơn nghỉ phép', 'nghỉ phép cán bộ', 'xin nghỉ phép', 'nhân sự'],
    headerSetup: {
      agencyUpper: 'TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM',
      agencyLower: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      agencyDepartment: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      documentSymbolPrefix: 'ĐƠN XIN NGHỈ PHÉP',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Ý kiến duyệt:',
      defaultRecipients: ['- Giám đốc TVCI đồng ý;', '- Lưu: Hồ sơ nhân sự.'],
      signerPosition: 'NGƯỜI LÀM ĐƠN',
      signerName: 'Ký và ghi rõ họ tên',
    },
    initialBodyParagraphs: [
      'Kính gửi: Viện trưởng, Trưởng phòng TC-HC và Giám đốc Trung tâm TVCI.',
      'Tôi tên là: [Họ và tên cán bộ], Chức vụ: Kỹ sư kiểm định.',
      'Kính xin được nghỉ phép: 03 ngày (từ ngày 05/10/2026 đến hết ngày 07/10/2026).',
      'Lý do xin nghỉ: Giải quyết việc gia đình cá nhân.',
      'Tôi cam đoan đã bàn giao toàn bộ hồ sơ kỹ thuật cho đồng nghiệp và giữ liên lạc trong thời gian nghỉ phép./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'iemm-thu-moi',
    name: 'Thư mời đối tác',
    title: 'Thư mời đối tác',
    category: 'bieu_mau_noi_bo',
    vietnameseCategory: 'Thư mời',
    organization: 'IEMM',
    fileName: 'iemm-thu-moi-template.docx',
    description: 'Thư mời đối tác tham gia hội thảo khoa học công nghệ và hội nghị khách hàng thường niên.',
    schemaId: 'thu_moi',
    defaultProfile: 'IEMM',
    keywords: ['thư mời', 'đối tác', 'hội nghị', 'khách hàng', 'khoa học'],
    headerSetup: {
      agencyUpper: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      agencyLower: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      documentSymbolPrefix: 'Số: …/TM-TVCI',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: ['- Như kính mời;', '- Lưu: VT, TVCI.'],
      signerPosition: 'GIÁM ĐỐC TRUNG TÂM',
      signerName: 'Nguyễn Văn An',
    },
    initialBodyParagraphs: [
      'Kính gửi: Lãnh đạo Quý Công ty / Đơn vị đối tác.',
      'Nhân dịp kỷ niệm ngày thành lập Viện, Trung tâm TVCI trân trọng kính mời Quý đại biểu tham dự Hội thảo kỹ thuật an toàn mỏ năm 2026.',
      'Sự hiện diện của Quý vị là niềm vinh hạnh lớn đối với chúng tôi./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
  {
    id: 'tvci-sample',
    name: 'Tài liệu mẫu chuẩn TVCI',
    title: 'Tài liệu mẫu chuẩn TVCI',
    category: 'cong_van',
    vietnameseCategory: 'Mẫu chuẩn TVCI',
    organization: 'TVCI',
    fileName: 'tvci-sample.docx',
    description: 'Tài liệu mẫu nguyên bản TVCI dùng cho kiểm thử tương thích, kiểm tra định dạng và hồi quy hệ thống.',
    schemaId: 'cong_van',
    defaultProfile: 'ND30_TVCI',
    keywords: ['tvci-sample', 'mẫu chuẩn', 'định dạng gốc', 'kiểm thử hồi quy'],
    headerSetup: {
      agencyUpper: 'TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM',
      agencyLower: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN',
      agencyDepartment: 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      documentSymbolPrefix: 'Số: 125/VCNM-TTTN',
      mottoUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      mottoLower: 'Độc lập - Tự do - Hạnh phúc',
      defaultLocation: 'Hà Nội',
    },
    footerSetup: {
      recipientsTitle: 'Nơi nhận:',
      defaultRecipients: [
        '- Như trên;',
        '- Tổng Giám đốc Tập đoàn (để b/c);',
        '- Ban An toàn - TKV;',
        '- Lưu: VT, TTTN.',
      ],
      signerPosition: 'KT. VIỆN TRƯỞNG\nPHÓ VIỆN TRƯỞNG',
      signerName: 'TS. Nguyễn Văn A',
    },
    initialBodyParagraphs: [
      'Kính gửi: Các đơn vị thành viên Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam.',
      'Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư;',
      'Căn cứ chức năng, nhiệm vụ của Viện Cơ khí Năng lượng và Mỏ - VINACOMIN trong công tác kiểm định kỹ thuật an toàn lao động và thử nghiệm công nghiệp;',
      'Nhằm đảm bảo an toàn tuyệt đối cho người lao động và thiết bị trong quá trình sản xuất than hầm lò, Trung tâm Thử nghiệm - Kiểm định Công nghiệp (TVCI) đề nghị Thủ trưởng các đơn vị phối hợp triển khai rà soát định kỳ toàn bộ hệ thống tời trục, quạt gió chính và thiết bị điện phòng nổ trước mùa mưa bão năm 2026.',
      'Kính đề nghị các đơn vị lập kế hoạch chi tiết và gửi văn bản đăng ký kiểm định về Viện trước ngày 25 tháng 9 năm 2026 để tổng hợp và bố trí lịch công tác./.',
    ],
    version: '1.0.0',
    status: 'active',
  },
];

export const ADMINISTRATIVE_TEMPLATES: AdministrativeTemplate[] = CATALOG_RECORDS.map((template) => ({
  ...template,
  verification: verificationFor(template),
}));

/** Compatibility alias for E2E test suites */
export const CATALOG = ADMINISTRATIVE_TEMPLATES;

export function isOfficialTemplateVerified(template: AdministrativeTemplate): boolean {
  const verification = template.verification;
  const canonical = verification.canonicalSource;
  const runtime = verification.runtime;
  return template.status === 'active'
    && verification.status === 'verified'
    && canonical?.kind === 'official-canonical-docx'
    && /^\/?canonical_templates\//.test(canonical.path)
    && /^[a-f0-9]{64}$/.test(canonical.sha256)
    && runtime.path === `/templates/${template.fileName}`
    && /^[a-f0-9]{64}$/.test(runtime.sha256 ?? '')
    && runtime.derivedFromCanonicalSha256 === canonical.sha256
    && (runtime.comparison === 'byte-exact' || runtime.comparison === 'content-controls-only');
}

export function requireVerifiedTemplate(templateOrId: AdministrativeTemplate | string): AdministrativeTemplate {
  const normalizedId = typeof templateOrId === 'string' ? templateOrId.trim().toLowerCase() : '';
  const template = typeof templateOrId === 'string'
    ? ADMINISTRATIVE_TEMPLATES.find((candidate) =>
      candidate.id.toLowerCase() === normalizedId || candidate.schemaId.toLowerCase() === normalizedId)
    : ADMINISTRATIVE_TEMPLATES.find((candidate) =>
      candidate.id === templateOrId.id
      && candidate.schemaId === templateOrId.schemaId
      && candidate.fileName === templateOrId.fileName
      && candidate.organization === templateOrId.organization);

  const name = typeof templateOrId === 'string' ? templateOrId : templateOrId.id;
  if (!template) {
    throw new Error(`Mẫu biểu không tồn tại trong hệ thống: ${name}`);
  }
  if (!isOfficialTemplateVerified(template)) {
    throw new Error(`Không thể áp dụng biểu mẫu "${name}": chưa có nguồn DOCX canonical được xác minh.`);
  }
  return template;
}

export function getTemplateById(id: string): AdministrativeTemplate | undefined {
  if (!id) return undefined;
  const targetId = id.trim().toLowerCase();
  return ADMINISTRATIVE_TEMPLATES.find((t) => t.id.toLowerCase() === targetId && isOfficialTemplateVerified(t));
}

export function getTemplatesByCategory(category: string): AdministrativeTemplate[] {
  const available = ADMINISTRATIVE_TEMPLATES.filter(isOfficialTemplateVerified);
  if (!category || category === 'all') return available;
  const targetCategory = category.trim().toLowerCase();
  return available.filter(
    (t) => t.category.toLowerCase() === targetCategory
  );
}

export function getTemplatesByOrganization(org: TemplateOrganization | string): AdministrativeTemplate[] {
  const available = ADMINISTRATIVE_TEMPLATES.filter(isOfficialTemplateVerified);
  if (!org || org === 'all') return available;
  const targetOrg = org.trim().toUpperCase();
  return available.filter(
    (t) => t.organization.toUpperCase() === targetOrg
  );
}

export function searchTemplates(
  query: string,
  options?: {
    organization?: TemplateOrganization | 'all';
    category?: TemplateCategory | 'all';
  }
): AdministrativeTemplate[] {
  const normQuery = normalizeVietnamese(query);

  return ADMINISTRATIVE_TEMPLATES.filter((template) => {
    if (!isOfficialTemplateVerified(template)) return false;
    // Org filter
    if (options?.organization && options.organization !== 'all') {
      if (template.organization.toUpperCase() !== options.organization.toUpperCase()) {
        return false;
      }
    }

    // Category filter
    if (options?.category && options.category !== 'all') {
      if (template.category.toLowerCase() !== options.category.toLowerCase()) {
        return false;
      }
    }

    if (!normQuery) return true;

    const normId = normalizeVietnamese(template.id);
    const normName = normalizeVietnamese(template.name);
    const normTitle = normalizeVietnamese(template.title);
    const normDesc = normalizeVietnamese(template.description);
    const normKeywords = template.keywords.map(normalizeVietnamese).join(' ');

    return (
      normId.includes(normQuery) ||
      normName.includes(normQuery) ||
      normTitle.includes(normQuery) ||
      normDesc.includes(normQuery) ||
      normKeywords.includes(normQuery)
    );
  });
}

export const searchAdministrativeTemplates = searchTemplates;
