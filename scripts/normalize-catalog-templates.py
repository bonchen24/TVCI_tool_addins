"""Normalize only bundled DOCX files referenced by the active catalog."""
from __future__ import annotations
import re
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
ET.register_namespace("w", W[1:-1])
HEADERS = {
    "IEMM": ("TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM", "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN"),
    "TVCI": ("VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN", "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP"),
}
FULL = {"IEMM": "Viện Cơ khí Năng lượng và Mỏ - Vinacomin", "TVCI": "Trung tâm Thử nghiệm - Kiểm định Công nghiệp"}

def child(parent, name):
    found = parent.find(W + name)
    return found if found is not None else ET.SubElement(parent, W + name)

def text(paragraph):
    return "".join(node.text or "" for node in paragraph.iter(W + "t"))

def paragraph(value, *, center=False, bold=False):
    p = ET.Element(W + "p")
    pr = ET.SubElement(p, W + "pPr")
    if center:
        ET.SubElement(pr, W + "jc", {W + "val": "center"})
    ET.SubElement(pr, W + "spacing", {W + "before": "0", W + "after": "0", W + "line": "240", W + "lineRule": "auto"})
    run = ET.SubElement(p, W + "r")
    rp = ET.SubElement(run, W + "rPr")
    ET.SubElement(rp, W + "rFonts", {W + "ascii": "Times New Roman", W + "hAnsi": "Times New Roman", W + "eastAsia": "Times New Roman"})
    ET.SubElement(rp, W + "sz", {W + "val": "26"})
    if bold:
        ET.SubElement(rp, W + "b")
    ET.SubElement(run, W + "t").text = value
    return p

def normalize(path, organization):
    with zipfile.ZipFile(path) as source:
        entries = [(info, source.read(info.filename)) for info in source.infolist()]
    root = ET.fromstring(next(data for info, data in entries if info.filename == "word/document.xml"))
    body = root.find(W + "body")
    assert body is not None
    section = root.find(".//" + W + "sectPr")
    assert section is not None
    child(section, "pgSz").attrib.update({W + "w": "11906", W + "h": "16838"})
    child(section, "pgMar").attrib.update({W + "top": "1134", W + "bottom": "1134", W + "left": "1701", W + "right": "850"})
    if organization in HEADERS:
        header = HEADERS[organization]
        first_table = body.find(W + "tbl")
        if first_table is not None:
            row = first_table.find(W + "tr")
            cells = row.findall(W + "tc") if row is not None else []
        else:
            cells = []
        if cells:
            left = cells[0]
            for index, label in enumerate(header):
                if not any(text(p) == label for p in left.iter(W + "p")):
                    left.insert(index + (1 if left.find(W + "tcPr") is not None else 0), paragraph(label, center=True, bold=index == 1))
        else:
            for index, label in enumerate(header):
                if not any(text(p) == label for p in body.iter(W + "p")):
                    body.insert(index, paragraph(label, center=True, bold=index == 1))
    else:
        party_header = ("ĐẢNG BỘ VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN", "ĐẢNG CỘNG SẢN VIỆT NAM")
        for index, label in enumerate(party_header):
            if not any(text(p) == label for p in body.iter(W + "p")):
                body.insert(index, paragraph(label, center=True, bold=True))
    if organization in HEADERS and first_table is not None:
        number_seen = False
        for cell in first_table.iter(W + "tc"):
            for p in list(cell.findall(W + "p")):
                value = text(p).strip()
                if value.startswith("Số:"):
                    if number_seen:
                        cell.remove(p)
                        continue
                    number_seen = True
                pr = p.find(W + "pPr")
                if pr is not None:
                    border = pr.find(W + "pBdr")
                    if border is not None:
                        pr.remove(border)
                for run in list(p.iter(W + "r")):
                    if run.find(W + "drawing") is None or text(run).strip():
                        continue
                    parent = next((node for node in p.iter() if run in list(node)), None)
                    if parent is not None:
                        parent.remove(run)
    for node in root.iter(W + "t"):
        if node.text:
            for token, full in FULL.items():
                node.text = re.sub(r"\b" + token + r"\b", full, node.text)
    if path.name in {"iemm-sample.docx", "tvci-sample.docx"}:
        for p in list(body.findall(W + "p")):
            value = text(p).strip()
            if value == FULL["TVCI"].upper() or value == "TRUNG TÂM " + FULL["TVCI"]:
                body.remove(p)
        for node in root.iter(W + "t"):
            if node.text:
                node.text = node.text.replace("BIỂU MẪU THỬ NGHIỆM ADD-IN", "PHIẾU THÔNG TIN")
                node.text = node.text.replace("Biểu mẫu mẫu dùng để kiểm thử việc chèn DOCX và điền Content Control trong TVCI Word Tools.", "Ghi rõ thông tin, nội dung đề nghị và tài liệu kèm theo trước khi trình ký.")
    if organization == "DANG":
        for node in root.iter(W + "t"):
            if node.text:
                node.text = node.text.replace("VĂN BẢN ĐẢNG MẪU", "ĐẢNG ỦY VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN")
                node.text = node.text.replace("Nội dung mẫu dùng để kiểm tra chức năng kho biểu mẫu. Người dùng có thể thay thế bằng mẫu DOCX chính thức của đơn vị.", "Đảng ủy Viện thống nhất nội dung, nhiệm vụ và trách nhiệm tổ chức thực hiện theo nghị quyết này.")
    for p in body.findall(W + "p"):
        content = text(p).strip()
        if not content or content.startswith(("Nơi nhận:", "Lưu:", "Kính gửi:", "Kính trình:", "Số:")):
            continue
        if content.startswith(("Căn cứ ", "Theo đề nghị ")):
            continue
        if content.isupper() or content.startswith(("Điều ", "Phần ", "Chương ", "Mục ", "Tiểu mục ")):
            continue
        pr = child(p, "pPr")
        child(pr, "jc").set(W + "val", "both")
        child(pr, "ind").set(W + "firstLine", "567")
        child(pr, "spacing").attrib.update({W + "after": "120", W + "line": "360", W + "lineRule": "exact"})
        for run in p.iter(W + "r"):
            rp = child(run, "rPr")
            child(rp, "rFonts").attrib.update({W + "ascii": "Times New Roman", W + "hAnsi": "Times New Roman"})
            child(rp, "sz").set(W + "val", "26")
    if not any(node.get(W + "val", "").startswith("TVCI_HRULE:") for node in root.iter(W + "tag")):
        rule = ET.Element(W + "sdt")
        ET.SubElement(ET.SubElement(rule, W + "sdtPr"), W + "tag", {W + "val": "TVCI_HRULE:TITLE_ABSTRACT"})
        content = ET.SubElement(rule, W + "sdtContent")
        line = ET.SubElement(content, W + "p")
        properties = ET.SubElement(line, W + "pPr")
        ET.SubElement(properties, W + "ind", {W + "left": "2807", W + "right": "2807"})
        ET.SubElement(ET.SubElement(properties, W + "pBdr"), W + "bottom", {W + "val": "single", W + "sz": "4", W + "space": "0", W + "color": "000000"})
        candidates = [p for p in body.findall(W + "p") if text(p).strip().isupper() and text(p).strip() not in HEADERS.get(organization, ()) and not text(p).startswith(("ĐẢNG BỘ", "ĐẢNG CỘNG SẢN"))]
        anchor = candidates[-1] if organization == "DANG" and candidates else candidates[0] if candidates else None
        body.insert(list(body).index(anchor) + 1 if anchor is not None else 0, rule)
    seen_tags = set()
    for parent in root.iter():
        for control in list(parent):
            if control.tag != W + "sdt":
                continue
            tag = control.find("./" + W + "sdtPr/" + W + "tag")
            value = tag.get(W + "val") if tag is not None else None
            if not value or value.startswith("TVCI_HRULE:"):
                continue
            if value in seen_tags:
                index = list(parent).index(control)
                payload = control.find(W + "sdtContent")
                parent.remove(control)
                if payload is not None:
                    for item in list(payload):
                        parent.insert(index, item)
                        index += 1
            else:
                seen_tags.add(value)
    document = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    with tempfile.NamedTemporaryFile(prefix="template-normalize-", suffix=".docx", dir=path.parent, delete=False) as handle:
        temp = Path(handle.name)
    try:
        with zipfile.ZipFile(temp, "w") as target:
            for info, data in entries:
                payload = document if info.filename == "word/document.xml" else data
                if info.filename.startswith("word/") and info.filename.endswith(".xml") and info.filename != "word/document.xml":
                    try:
                        part = ET.fromstring(payload)
                    except ET.ParseError:
                        pass
                    else:
                        changed = False
                        for node in part.iter(W + "t"):
                            if node.text:
                                original = node.text
                                for token, full in FULL.items():
                                    node.text = re.sub(r"\b" + token + r"\b", full, node.text)
                                changed |= node.text != original
                        if changed:
                            payload = ET.tostring(part, encoding="utf-8", xml_declaration=True)
                target.writestr(info, payload)
        temp.replace(path)
    finally:
        temp.unlink(missing_ok=True)

def main():
    catalog = (ROOT / "src/templates/catalog.ts").read_text(encoding="utf-8")
    records = re.findall(r'organization: "(IEMM|TVCI|DANG)"[\s\S]*?source: \{ kind: "bundled", path: "(/templates/[^"]+)" \}', catalog)
    paths = {}
    for organization, source in records:
        path = ROOT / source.lstrip("/")
        if path in paths and paths[path] != organization:
            raise ValueError(f"Conflicting organization: {path}")
        paths[path] = organization
    controls_source = (ROOT / "scripts/add-template-form-content-controls.py").read_text(encoding="utf-8")
    controls_namespace = {}
    exec(controls_source[:controls_source.index("for relative_path, controls in FORM_CONTROLS.items():")], controls_namespace)
    controls_by_path = controls_namespace["FORM_CONTROLS"]
    patch_controls = controls_namespace["patch_package"]
    for path, organization in paths.items():
        relative = path.relative_to(ROOT).as_posix()
        if relative in controls_by_path:
            patch_controls(path, controls_by_path[relative])
        normalize(path, organization)
    print(f"Normalized {len(paths)} catalog DOCX files: " + ", ".join(f"{org}={sum(v == org for v in paths.values())}" for org in ("IEMM", "TVCI", "DANG")))

if __name__ == "__main__":
    main()









