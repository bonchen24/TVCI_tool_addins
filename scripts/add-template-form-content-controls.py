from copy import deepcopy
from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZIP_DEFLATED, ZipFile

from lxml import etree

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = f"{{{W_NS}}}"
XML_SPACE = "{http://www.w3.org/XML/1998/namespace}space"

# Each entry uses an existing placeholder when possible. A blank control is used
# only when the approved source document has no matching visual placeholder.
FORM_CONTROLS = {
    "templates/iemm/01-quyet-dinh-ca-biet.docx": {
        "SO_KY_HIEU": "[KÝ HIỆU]",
        "NGAY_BAN_HANH": "[Địa danh], ngày [dd] tháng [mm] năm [yyyy]",
        "TRICH_YEU": "[Tên nội dung quyết định cá biệt]",
        "CAN_CU": "[văn bản pháp lý, quy chế hoặc thẩm quyền liên quan]",
        "DIEU_KHOAN": "[Nội dung điều khoản và đối tượng thực hiện]",
        "NGUOI_KY": "[Họ và tên]",
        "NOI_NHAN": "Lưu: VT, Văn phòng, 01 bản.",
    },
    "templates/iemm/02-quyet-dinh-ban-hanh-van-ban.docx": {
        "SO_KY_HIEU": "[KÝ HIỆU]",
        "NGAY_BAN_HANH": "[Địa danh], ngày [dd] tháng [mm] năm [yyyy]",
        "TRICH_YEU": "[Tên nội dung quyết định ban hành/phê duyệt văn bản]",
        "CAN_CU": "[văn bản pháp lý, quy chế hoặc thẩm quyền liên quan]",
        "DIEU_KHOAN": "[Nội dung điều khoản và đối tượng thực hiện]",
        "NGUOI_KY": "[Họ và tên]",
        "NOI_NHAN": "Lưu: VT, Văn phòng, 01 bản.",
    },
    "templates/iemm/05-cong-van-hanh-chinh.docx": {
        "SO_KY_HIEU": "[KÝ HIỆU]",
        "NGAY_BAN_HANH": "[Địa danh], ngày [dd] tháng [mm] năm [yyyy]",
        "NOI_NHAN_TRUC_TIEP": "[Tên cơ quan, tổ chức hoặc cá nhân nhận văn bản]",
        "TRICH_YEU": "[trích yếu nội dung của công văn hành chính]",
        "NOI_DUNG": "[NỘI DUNG]",
        "NGUOI_KY": "[Họ và tên]",
        "NOI_NHAN": "Lưu: VT, Văn phòng, 01 bản.",
    },
    "templates/iemm/06-thong-bao-noi-bo-vien.docx": {
        "SO_KY_HIEU": "/VCKM-TB",
        "NGAY_BAN_HANH": "[Địa danh], ngày [dd] tháng [mm] năm [yyyy]",
        "TRICH_YEU": "[trích yếu nội dung của thông báo nội bộ viện]",
        "NOI_DUNG": "[NỘI DUNG]",
        "DOI_TUONG_NHAN": "[Tên cơ quan, tổ chức hoặc cá nhân nhận văn bản]",
        "NGUOI_KY": "[Họ và tên]",
        "NOI_NHAN": "Lưu: VT, Văn phòng, 01 bản.",
    },
    "templates/iemm/07-to-trinh-cua-vien.docx": {
        "SO_KY_HIEU": "[KÝ HIỆU]",
        "NGAY_BAN_HANH": "[Địa danh], ngày [dd] tháng [mm] năm [yyyy]",
        "KINH_GUI": "[Chức danh/người có thẩm quyền xem xét]",
        "CAN_CU": "Nêu bối cảnh, căn cứ và lý do đề xuất.",
        "LY_DO": "Nêu bối cảnh, căn cứ và lý do đề xuất.",
        "DE_XUAT_KIEN_NGHI": "Nội dung xin ý kiến hoặc đề nghị phê duyệt",
        "NGUOI_KY": "[Họ và tên]",
        "NOI_NHAN": "Lưu: VT, Văn phòng, 01 bản.",
    },
    "templates/iemm/08-to-trinh-cua-don-vi-gui-vien.docx": {
        "SO_KY_HIEU": "[KÝ HIỆU]",
        "NGAY_BAN_HANH": "[Địa danh], ngày [dd] tháng [mm] năm [yyyy]",
        "KINH_GUI": "Viện trưởng Viện Cơ khí Năng lượng và Mỏ - VINACOMIN",
        "CAN_CU": "Nêu lý do/cơ sở đề nghị.",
        "LY_DO": "Nêu lý do/cơ sở đề nghị.",
        "DE_XUAT_KIEN_NGHI": "Kiến nghị Viện xem xét/phê duyệt.",
        "NGUOI_KY": "[Họ và tên]",
        "NOI_NHAN": "[Họ và tên]",
    },
    "templates/iemm/09-bien-ban.docx": {
        "THOI_GIAN": "[Giờ, ngày, tháng, năm]",
        "DIA_DIEM": "[Địa điểm tổ chức]",
        "THANH_PHAN": "[Danh sách người tham dự]",
        "CHU_TRI": "[CHỦ TRÌ / NGƯỜI CÓ THẨM QUYỀN]",
        "THU_KY": "THƯ KÝ",
        "NOI_DUNG_DIEN_BIEN": "[NỘI DUNG]",
        "KET_LUAN": "[Tiếp tục nội dung, căn cứ, thời hạn hoặc trách nhiệm thực hiện]",
        "NGUOI_KY": "[Họ và tên]",
    },
    "templates/iemm/10-van-ban-chung.docx": {
        "SO_KY_HIEU": "[LOẠI]-VCNM",
        "NGAY_BAN_HANH": "[Địa danh], ngày [dd] tháng [mm] năm [yyyy]",
        "KINH_GUI": "[TÊN LOẠI VĂN BẢN]",
        "KY_BAO_CAO": "[Nội dung văn bản hành chính chung]",
        "NOI_DUNG": "[NỘI DUNG]",
        "KIEN_NGHI": "[Kết thúc nội dung.]",
        "NGUOI_KY": "[Họ và tên]",
        "NOI_NHAN": "Lưu: VT, Văn phòng, 01 bản.",
    },
    "templates/iemm/12-thu-moi-hop.docx": {
        "DOI_TUONG_MOI": "………………………………………………………………………",
        "NOI_DUNG_CUOC_HOP": "Trân trọng kính mời ………………………………… đến dự Hội nghị/cuộc họp …………………………………",
        "THOI_GIAN": "bắt đầu lúc … giờ …, ngày … tháng … năm …",
        "DIA_DIEM": "………………………………………………………………………",
        "CHU_TRI": "…………………………………………………………………………",
        "CHUAN_BI": "……………………………………………………………",
        "NGUOI_KY": "[Họ và tên]",
    },
    "templates/iemm-cong-van-template.docx": {
        "SO_KY_HIEU": "/VCNM-[ĐƠN VỊ]",
        "TRICH_YEU": "V/v ……………………………………………",
        "NGAY_BAN_HANH": "Hà Nội, ngày … tháng … năm …",
        "NOI_NHAN_TRUC_TIEP": "- ………………………………………………………………………;",
        "NOI_DUNG": "[Mở đầu: nêu mục đích, lý do hoặc cơ sở ban hành công văn.]",
        "NGUOI_KY": "[Họ và tên]",
        "NOI_NHAN": "Lưu: VT, Văn phòng, 01 bản.",
    },
    "templates/iemm-thong-bao-template.docx": {
        "SO_KY_HIEU": "/VCKM-TB",
        "NGAY_BAN_HANH": "Hà Nội, ngày … tháng … năm …",
        "TRICH_YEU": "Về ………………………………………………………",
        "NOI_DUNG": "[Căn cứ hoặc lý do ban hành thông báo.]",
        "DOI_TUONG_NHAN": "Các đơn vị trong Viện",
        "NGUOI_KY": "[Họ và tên]",
        "NOI_NHAN": "Lưu: VT, Văn phòng, 01 bản.",
    },
    "templates/iemm-to-trinh-template.docx": {
        "SO_KY_HIEU": "/TTr-VCNM",
        "NGAY_BAN_HANH": "Hà Nội, ngày … tháng … năm …",
        "KINH_GUI": "………………………………………………………………………",
        "CAN_CU": "Nêu lý do viết tờ trình hoặc cơ sở để đưa ra đề nghị mới.",
        "LY_DO": "Nêu lý do viết tờ trình hoặc cơ sở để đưa ra đề nghị mới.",
        "DE_XUAT_KIEN_NGHI": "Nêu ý nghĩa, hiệu quả của đề nghị và kiến nghị cấp trên hỗ trợ/phê chuẩn.",
        "NGUOI_KY": "[Họ và tên]",
        "NOI_NHAN": "Lưu: VT, Văn phòng, 01 bản.",
    },
    "templates/iemm-to-trinh-noi-bo-template.docx": {
        "NGAY_BAN_HANH": "Hà Nội, ngày … tháng … năm …",
        "KINH_GUI": "Viện trưởng Viện Cơ khí Năng lượng và Mỏ - VINACOMIN",
        "CAN_CU": "Nêu lý do/cơ sở đề nghị.",
        "LY_DO": "Nêu lý do/cơ sở đề nghị.",
        "DE_XUAT_KIEN_NGHI": "Kiến nghị Viện xem xét/phê duyệt.",
        "NGUOI_KY": "[Họ và tên]",
        "NOI_NHAN": "[Họ và tên]",
    },
    "templates/tvci-cong-van-template.docx": {
        "SO_KY_HIEU": "/VCNM-TTTN",
        "TRICH_YEU": "V/v ……………………………………………",
        "NGAY_BAN_HANH": "Hà Nội, ngày … tháng … năm …",
        "NOI_NHAN_TRUC_TIEP": "- ………………………………………………………………………;",
        "NOI_DUNG": "[Mở đầu: nêu mục đích, lý do hoặc cơ sở ban hành công văn.]",
        "NGUOI_KY": "[Họ và tên]",
        "NOI_NHAN": "Lưu: VT, Văn phòng, 01 bản.",
    },
    "templates/tvci-thong-bao-template.docx": {
        "SO_KY_HIEU": "/VCKM-TB",
        "NGAY_BAN_HANH": "Hà Nội, ngày … tháng … năm …",
        "TRICH_YEU": "Về ………………………………………………………",
        "NOI_DUNG": "[Căn cứ hoặc lý do ban hành thông báo.]",
        "DOI_TUONG_NHAN": "Các đơn vị/cá nhân có liên quan",
        "NGUOI_KY": "[Họ và tên]",
        "NOI_NHAN": "Lưu: VT, Văn phòng, 01 bản.",
    },
    "templates/iemm-don-xin-nghi-phep-template.docx": {
        "HO_TEN": "............................................................",
        "DON_VI_CONG_VIEC": ".......................................................",
        "LOAI_NGHI": "nghỉ phép năm .........",
        "TU_NGAY": "...../...../20....",
        "DEN_NGAY": "...../...../20....",
        "LY_DO": ".......................................................",
        "NGUOI_DUYET": "VIỆN TRƯỞNG DUYỆT",
    },
}


def text_nodes(root):
    return root.xpath("//*[local-name()='body']//*[local-name()='t']")


def run_with_text(original_run, value):
    run = etree.Element(W + "r", nsmap=original_run.nsmap)
    properties = original_run.find(W + "rPr")
    if properties is not None:
        run.append(deepcopy(properties))
    text = etree.SubElement(run, W + "t")
    text.text = value
    if value[:1].isspace() or value[-1:].isspace():
        text.set(XML_SPACE, "preserve")
    return run


def content_control(tag, run):
    sdt = etree.Element(W + "sdt", nsmap=run.nsmap)
    properties = etree.SubElement(sdt, W + "sdtPr")
    tag_node = etree.SubElement(properties, W + "tag")
    tag_node.set(W + "val", tag)
    content = etree.SubElement(sdt, W + "sdtContent")
    content.append(run)
    return sdt


def insert_blank_control(root, tag):
    paragraphs = root.xpath("//*[local-name()='body']//*[local-name()='p']")
    if not paragraphs:
        return False
    run = run_with_text(etree.Element(W + "r"), "")
    paragraphs[-1].append(content_control(tag, run))
    return True


def wrap_anchor(root, tag, anchor):
    for text_node in text_nodes(root):
        value = text_node.text or ""
        start = value.find(anchor)
        if start < 0:
            continue
        if text_node.xpath("ancestor::*[local-name()='sdt']"):
            continue
        original_run = text_node.getparent()
        while original_run is not None and original_run.tag != W + "r":
            original_run = original_run.getparent()
        if original_run is None:
            continue
        parent = original_run.getparent()
        if parent is None:
            continue
        before = value[:start]
        match = value[start:start + len(anchor)]
        after = value[start + len(anchor):]
        replacement = []
        if before:
            replacement.append(run_with_text(original_run, before))
        replacement.append(content_control(tag, run_with_text(original_run, match)))
        if after:
            replacement.append(run_with_text(original_run, after))
        index = parent.index(original_run)
        parent.remove(original_run)
        for offset, item in enumerate(replacement):
            parent.insert(index + offset, item)
        return True
    return False


def patch_document(data, controls):
    root = etree.fromstring(data)
    existing = {
        value
        for value in root.xpath("//*[local-name()='tag']/@*[local-name()='val']")
    }
    for tag, anchor in controls.items():
        if tag in existing:
            continue
        if anchor and wrap_anchor(root, tag, anchor):
            existing.add(tag)
        elif insert_blank_control(root, tag):
            existing.add(tag)
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def patch_package(path, controls):
    with ZipFile(path) as source:
        document = patch_document(source.read("word/document.xml"), controls)
        with NamedTemporaryFile(prefix="template-form-", suffix=".docx", dir=path.parent, delete=False) as temp:
            temp_path = Path(temp.name)
        try:
            with ZipFile(temp_path, "w") as target:
                for info in source.infolist():
                    payload = document if info.filename == "word/document.xml" else source.read(info.filename)
                    target.writestr(info, payload)
            # The managed workspace permits writing the existing payload but may
            # deny an atomic rename over a bundled binary. Keep the target path
            # stable and copy the fully-written ZIP into it instead.
            path.write_bytes(temp_path.read_bytes())
        finally:
            temp_path.unlink(missing_ok=True)


for relative_path, controls in FORM_CONTROLS.items():
    path = Path(relative_path)
    if not path.exists():
        raise FileNotFoundError(path)
    patch_package(path, controls)
    print(f"patched {path} ({len(controls)} form controls)")
