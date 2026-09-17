from __future__ import annotations

import copy
import os
import sys
import tempfile
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
from xml.etree import ElementTree as ET


W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W_NS}
ET.register_namespace("w", W_NS)
HEADER_RULE_HEIGHT_EMU = "9000"
XML_NS = "http://www.w3.org/XML/1998/namespace"
DOCUMENT_NUMBER_SPACING = "       "
GENERIC_DOCUMENT_SYMBOL = "[KÝ HIỆU]"
NOTICE_TEMPLATE_NAMES = {
    "06-thong-bao-noi-bo-vien.docx",
    "iemm-thong-bao-template.docx",
    "tvci-thong-bao-template.docx",
}


def local_name(element: ET.Element) -> str:
    return element.tag.rsplit("}", 1)[-1]


def paragraph_text(paragraph: ET.Element) -> str:
    return "".join(paragraph.itertext()).strip()


def set_run_text(run: ET.Element, text: str) -> None:
    text_nodes = [child for child in list(run) if local_name(child) == "t"]
    if text_nodes:
        text_node = text_nodes[0]
        for extra in text_nodes[1:]:
            run.remove(extra)
    else:
        text_node = ET.Element(f"{{{W_NS}}}t")
        run.append(text_node)

    text_node.text = text
    if text[:1].isspace() or text[-1:].isspace():
        text_node.set(f"{{{XML_NS}}}space", "preserve")
    else:
        text_node.attrib.pop(f"{{{XML_NS}}}space", None)


def set_paragraph_text(paragraph: ET.Element, text: str) -> None:
    runs = [
        element
        for element in paragraph.iter()
        if local_name(element) == "r" and any(local_name(child) == "t" for child in element)
    ]
    if not runs:
        return
    set_run_text(runs[0], text)
    for run in runs[1:]:
        set_run_text(run, "")


def parent_of(root: ET.Element, child: ET.Element) -> ET.Element | None:
    for candidate in root.iter():
        if child in list(candidate):
            return candidate
    return None


def next_sibling_paragraph(parent: ET.Element, paragraph: ET.Element) -> ET.Element | None:
    children = list(parent)
    try:
        start = children.index(paragraph) + 1
    except ValueError:
        return None
    return next((child for child in children[start:] if local_name(child) == "p"), None)


def normalize_static_addressee_layout(document: ET.Element, template_name: str) -> None:
    inline_recipients = {
        "iemm-thong-bao-template.docx": "Các đơn vị trong Viện",
        "iemm-thu-moi-template.docx": "………………………………………………………………………",
        "iemm-to-trinh-noi-bo-template.docx": "Viện trưởng Viện Cơ khí Năng lượng và Mỏ - VINACOMIN",
        "iemm-to-trinh-template.docx": "………………………………………………………………………",
        "tvci-thong-bao-template.docx": "Các đơn vị/cá nhân có liên quan",
    }
    recipient = inline_recipients.get(template_name)
    if recipient:
        label = next(
            (paragraph for paragraph in document.iter() if local_name(paragraph) == "p" and paragraph_text(paragraph) == "Kính gửi:"),
            None,
        )
        if label is not None:
            parent = parent_of(document, label)
            following = next_sibling_paragraph(parent, label) if parent is not None else None
            if following is not None and paragraph_text(following) == recipient:
                set_paragraph_text(label, f"Kính gửi: {recipient}")
                parent.remove(following)
        return

    if template_name != "iemm-don-xin-nghi-phep-template.docx":
        return

    label = next(
        (
            paragraph
            for paragraph in document.iter()
            if local_name(paragraph) == "p" and paragraph_text(paragraph).startswith("Kính gửi: - ")
        ),
        None,
    )
    if label is None:
        return
    parent = parent_of(document, label)
    following = next_sibling_paragraph(parent, label) if parent is not None else None
    if parent is None or following is None:
        return

    first_recipient = paragraph_text(label)[len("Kính gửi: - ") :].rstrip(";,. ")
    second_recipient = paragraph_text(following).lstrip("- ").rstrip(";,. ")
    first_line = copy.deepcopy(following)
    set_paragraph_text(label, "Kính gửi:")
    set_paragraph_text(first_line, f"- {first_recipient};")
    set_paragraph_text(following, f"- {second_recipient}.")
    parent.insert(list(parent).index(label) + 1, first_line)


def document_number_symbol(current_text: str, notice_template: bool) -> str:
    if notice_template:
        return "VCKM-TB"

    ellipsis_index = current_text.find("…")
    if ellipsis_index >= 0:
        suffix = current_text[ellipsis_index + 1 :].strip()
        return suffix[1:].strip() if suffix.startswith("/") else suffix

    after_prefix = current_text[len("Số:") :].strip()
    if after_prefix.startswith("/"):
        return after_prefix[1:].strip()
    if after_prefix == "[Số, ký hiệu]" or not after_prefix:
        return GENERIC_DOCUMENT_SYMBOL
    return after_prefix


def format_document_number_paragraph(paragraph: ET.Element, notice_template: bool) -> None:
    current_text = paragraph_text(paragraph)
    if not current_text.startswith("Số:"):
        return

    symbol = document_number_symbol(current_text, notice_template)
    runs = [
        element
        for element in paragraph.iter()
        if local_name(element) == "r" and any(local_name(child) == "t" for child in element)
    ]
    if len(runs) >= 2:
        set_run_text(runs[0], "Số:")
        set_run_text(runs[1], f"{DOCUMENT_NUMBER_SPACING}/{symbol}")
        for run in runs[2:]:
            set_run_text(run, "")
    elif runs:
        set_run_text(runs[0], f"Số:{DOCUMENT_NUMBER_SPACING}/{symbol}")


def format_document_numbers(document: ET.Element, notice_template: bool) -> None:
    for paragraph in document.iter():
        if local_name(paragraph) == "p":
            format_document_number_paragraph(paragraph, notice_template)


def direct_paragraphs(cell: ET.Element) -> list[ET.Element]:
    return [child for child in cell if local_name(child) == "p"]


def replace_cell_branding(target_cell: ET.Element, canonical_cell: ET.Element, preserve_from: int | None) -> None:
    target_children = list(target_cell)
    target_properties = [child for child in target_children if local_name(child) == "tcPr"]
    preserved = direct_paragraphs(target_cell)[preserve_from:] if preserve_from is not None else []
    replacement = target_properties + [copy.deepcopy(child) for child in canonical_cell if local_name(child) != "tcPr"]
    replacement.extend(copy.deepcopy(paragraph) for paragraph in preserved)
    target_cell[:] = replacement


def first_matching_paragraph_index(cell: ET.Element, markers: tuple[str, ...], start: int = 0) -> int | None:
    for index, paragraph in enumerate(direct_paragraphs(cell)):
        if index >= start and any(marker in paragraph_text(paragraph) for marker in markers):
            return index
    return None


def thin_header_rule_shapes(document: ET.Element) -> None:
    for inline in (element for element in document.iter() if local_name(element) == "inline"):
        is_header_rule = any(
            local_name(element) == "docPr" and element.attrib.get("name") == "Header rule"
            for element in inline.iter()
        )
        if not is_header_rule:
            continue
        extent = next((element for element in inline.iter() if local_name(element) == "extent"), None)
        if extent is None:
            raise ValueError("Header rule drawing has no extent")
        extent.set("cy", HEADER_RULE_HEIGHT_EMU)


def patch_document(document_xml: bytes, canonical_table: ET.Element, notice_template: bool, template_name: str) -> bytes:
    document = ET.fromstring(document_xml)
    body = document.find("w:body", NS)
    if body is None:
        raise ValueError("document.xml has no w:body")

    first_table = next((child for child in body if local_name(child) == "tbl"), None)
    if first_table is None:
        body.insert(0, copy.deepcopy(canonical_table))
        format_document_numbers(document, notice_template)
        normalize_static_addressee_layout(document, template_name)
        thin_header_rule_shapes(document)
        return ET.tostring(document, encoding="utf-8", xml_declaration=True)

    canonical_rows = [child for child in canonical_table if local_name(child) == "tr"]
    target_rows = [child for child in first_table if local_name(child) == "tr"]
    if not canonical_rows or not target_rows:
        raise ValueError("header table has no rows")
    canonical_cells = [child for child in canonical_rows[0] if local_name(child) == "tc"]
    target_cells = [child for child in target_rows[0] if local_name(child) == "tc"]
    if len(canonical_cells) < 2 or len(target_cells) < 2:
        raise ValueError("header table must have two cells")

    left_preserve = first_matching_paragraph_index(target_cells[0], ("Số:", "Số "), start=1)
    right_preserve = first_matching_paragraph_index(
        target_cells[1], ("Hà Nội", "Địa danh", "ngày", "____", "—"), start=2
    )
    replace_cell_branding(target_cells[0], canonical_cells[0], left_preserve)
    replace_cell_branding(target_cells[1], canonical_cells[1], right_preserve)

    canonical_properties = next((child for child in canonical_table if local_name(child) == "tblPr"), None)
    canonical_grid = next((child for child in canonical_table if local_name(child) == "tblGrid"), None)
    for child_name, canonical_child in (("tblPr", canonical_properties), ("tblGrid", canonical_grid)):
        if canonical_child is None:
            continue
        existing = next((child for child in first_table if local_name(child) == child_name), None)
        if existing is not None:
            first_table.remove(existing)
        insert_at = 0 if child_name == "tblPr" else 1
        first_table.insert(insert_at, copy.deepcopy(canonical_child))

    thin_header_rule_shapes(document)
    format_document_numbers(document, notice_template)
    normalize_static_addressee_layout(document, template_name)
    return ET.tostring(document, encoding="utf-8", xml_declaration=True)


def patch_docx(path: Path, canonical_table: ET.Element) -> None:
    notice_template = path.name in NOTICE_TEMPLATE_NAMES
    with ZipFile(path, "r") as source:
        entries = [(info, source.read(info.filename)) for info in source.infolist()]

    patched_entries = []
    for info, data in entries:
        if info.filename == "word/document.xml":
            data = patch_document(data, canonical_table, notice_template, path.name)
        patched_entries.append((info, data))

    temporary_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=f".{path.stem}-", suffix=".docx", delete=False) as temporary:
            temporary_path = temporary.name
        with ZipFile(temporary_path, "w", compression=ZIP_DEFLATED) as destination:
            for info, data in patched_entries:
                destination.writestr(info, data)
        os.replace(temporary_path, path)
        temporary_path = None
    finally:
        if temporary_path:
            os.unlink(temporary_path)


def main() -> int:
    template_root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("templates")
    canonical_path = template_root / "iemm" / "01-quyet-dinh-ca-biet.docx"
    with ZipFile(canonical_path, "r") as source:
        canonical_document = ET.fromstring(source.read("word/document.xml"))
    canonical_table = next((child for child in canonical_document.find("w:body", NS) if local_name(child) == "tbl"), None)
    if canonical_table is None:
        raise SystemExit("Canonical IEMM template has no first-page header table")

    targets = sorted(path for path in template_root.rglob("*.docx") if path.name != "dang-sample.docx")
    if len(targets) != 30:
        raise SystemExit(f"Expected 30 civil templates, found {len(targets)}")
    for path in targets:
        patch_docx(path, canonical_table)
    print(f"Applied IEMM header identity to {len(targets)} civil templates")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
