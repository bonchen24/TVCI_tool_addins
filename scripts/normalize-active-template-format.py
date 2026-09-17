from __future__ import annotations

import argparse
import re
import sys
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = f"{{{W}}}"
ET.register_namespace("w", W)
ET.register_namespace("wp", "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing")
ET.register_namespace("a", "http://schemas.openxmlformats.org/drawingml/2006/main")
ET.register_namespace("wps", "http://schemas.microsoft.com/office/word/2010/wordprocessingShape")
ET.register_namespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
ET.register_namespace("mc", "http://schemas.openxmlformats.org/markup-compatibility/2006")

ACTIVE_EXCLUDED = {"sample-template.docx", "tkv-sample.docx", "tkv-quyet-dinh-template.docx"}
BODY_SKIP_PREFIXES = ("Số:", "V/v", "Kính gửi", "Nơi nhận", "Căn cứ", "Lưu:")
PAGE_WIDTH_TWIPS = 11906
PAGE_LEFT_MARGIN_TWIPS = 1701
PAGE_RIGHT_MARGIN_TWIPS = 850
HEADER_RIGHT_EXTENSION_TWIPS = 283  # 5 mm
HEADER_LEFT_EXTENSION_TWIPS = 283  # 5 mm
HEADER_TABLE_MARKER = "TVCI_HEADER_EXT_R5"
HEADER_TABLE_MARKER_LEFT = "TVCI_HEADER_EXT_R5_L5"
NATIONAL_MOTTO_RULE_TAG = "TVCI_HRULE:NATIONAL_MOTTO"
NATIONAL_MOTTO_RULE_WIDTH_TWIPS = 3150  # Matches the 13 pt motto text width.
NATIONAL_MOTTO_RULE_HEIGHT_EMU = 6350  # 0.5 pt line.
DOCUMENT_TYPES = {
    "NGHỊ QUYẾT", "QUYẾT ĐỊNH", "CHỈ THỊ", "QUY ĐỊNH", "QUY CHẾ", "THÔNG BÁO",
    "KẾ HOẠCH", "BÁO CÁO", "TỜ TRÌNH", "BIÊN BẢN", "CÔNG VĂN", "HƯỚNG DẪN",
}


def text_of(paragraph: ET.Element) -> str:
    return "".join(node.text or "" for node in paragraph.iter(f"{NS}t")).strip()


def all_paragraphs(root: ET.Element) -> list[ET.Element]:
    return list(root.iter(f"{NS}p"))


def direct_body_paragraphs(root: ET.Element) -> list[ET.Element]:
    body = root.find(f"{NS}body")
    return list(body.findall(f"{NS}p")) if body is not None else []


def ensure_child(parent: ET.Element, tag: str) -> ET.Element:
    child = parent.find(tag)
    if child is None:
        child = ET.Element(tag)
        parent.append(child)
    return child


def set_page_setup(root: ET.Element) -> None:
    section = root.find(f".//{NS}sectPr")
    if section is None:
        return
    page_size = ensure_child(section, f"{NS}pgSz")
    page_size.set(f"{NS}w", "11906")
    page_size.set(f"{NS}h", "16838")
    margins = ensure_child(section, f"{NS}pgMar")
    margins.set(f"{NS}top", "1134")
    margins.set(f"{NS}bottom", "1134")
    margins.set(f"{NS}left", "1701")
    margins.set(f"{NS}right", "850")


def table_grid_widths(table: ET.Element) -> list[int]:
    grid = table.find(f"{NS}tblGrid")
    if grid is None:
        return []
    return [int(column.get(f"{NS}w", "0")) for column in grid.findall(f"{NS}gridCol")]


def table_cell_text(table: ET.Element, column_index: int) -> list[str]:
    texts: list[str] = []
    for row in table.findall(f"{NS}tr"):
        cells = row.findall(f"{NS}tc")
        if column_index >= len(cells):
            continue
        for paragraph in cells[column_index].iter(f"{NS}p"):
            text = text_of(paragraph)
            if text:
                texts.append(text)
    return texts


def header_needs_left_extension(table: ET.Element) -> bool:
    """Use the second 5 mm only for genuinely long header metadata."""
    for text in table_cell_text(table, 0):
        if text.startswith("V/v") and len(text) >= 38:
            return True
        if len(text) >= 48:
            return True
    return False


def set_table_cell_width(cell: ET.Element, width: int) -> None:
    properties = cell.find(f"{NS}tcPr")
    if properties is None:
        properties = ET.Element(f"{NS}tcPr")
        cell.insert(0, properties)
    cell_width = properties.find(f"{NS}tcW")
    if cell_width is None:
        cell_width = ET.Element(f"{NS}tcW")
        properties.insert(0, cell_width)
    cell_width.set(f"{NS}w", str(width))
    cell_width.set(f"{NS}type", "dxa")


def set_table_width(table: ET.Element, widths: list[int], indent: int) -> None:
    properties = ensure_child(table, f"{NS}tblPr")
    table_width = properties.find(f"{NS}tblW")
    if table_width is None:
        table_width = ET.Element(f"{NS}tblW")
        properties.insert(0, table_width)
    table_width.set(f"{NS}w", str(sum(widths)))
    table_width.set(f"{NS}type", "dxa")

    alignment = properties.find(f"{NS}jc")
    if alignment is None:
        alignment = ET.SubElement(properties, f"{NS}jc")
    alignment.set(f"{NS}val", "left")

    table_indent = properties.find(f"{NS}tblInd")
    if table_indent is None:
        table_indent = ET.SubElement(properties, f"{NS}tblInd")
    table_indent.set(f"{NS}w", str(indent))
    table_indent.set(f"{NS}type", "dxa")

    layout = properties.find(f"{NS}tblLayout")
    if layout is None:
        layout = ET.SubElement(properties, f"{NS}tblLayout")
    layout.set(f"{NS}type", "fixed")

    grid = table.find(f"{NS}tblGrid")
    if grid is None:
        grid = ET.Element(f"{NS}tblGrid")
        table.insert(1, grid)
    for child in list(grid):
        grid.remove(child)
    for width in widths:
        column = ET.SubElement(grid, f"{NS}gridCol")
        column.set(f"{NS}w", str(width))

    for row in table.findall(f"{NS}tr"):
        for index, cell in enumerate(row.findall(f"{NS}tc")):
            if index < len(widths):
                set_table_cell_width(cell, widths[index])


def expand_header_tables(root: ET.Element) -> int:
    """Give the two header tables up to 5 mm on the right, then on the left."""
    body = root.find(f"{NS}body")
    if body is None:
        return 0
    tables = [child for child in body if child.tag == f"{NS}tbl"][:2]
    changed = 0
    body_width = PAGE_WIDTH_TWIPS - PAGE_LEFT_MARGIN_TWIPS - PAGE_RIGHT_MARGIN_TWIPS
    for table in tables:
        widths = table_grid_widths(table)
        if len(widths) < 2:
            continue
        properties = table.find(f"{NS}tblPr")
        description = properties.find(f"{NS}tblDescription") if properties is not None else None
        marker = description.get(f"{NS}val") if description is not None else None
        if marker in {HEADER_TABLE_MARKER, HEADER_TABLE_MARKER_LEFT}:
            continue

        current_width = sum(widths)
        centered_gap = max(0, (body_width - current_width) // 2)
        needs_left = header_needs_left_extension(table)
        expanded_widths = list(widths)
        expanded_widths[0] += HEADER_RIGHT_EXTENSION_TWIPS
        indent = centered_gap
        marker_value = HEADER_TABLE_MARKER
        if needs_left:
            expanded_widths[0] += HEADER_LEFT_EXTENSION_TWIPS
            indent -= HEADER_LEFT_EXTENSION_TWIPS
            marker_value = HEADER_TABLE_MARKER_LEFT
        set_table_width(table, expanded_widths, indent)
        properties = ensure_child(table, f"{NS}tblPr")
        description = properties.find(f"{NS}tblDescription")
        if description is None:
            description = ET.SubElement(properties, f"{NS}tblDescription")
        description.set(f"{NS}val", marker_value)
        changed += 1
    return changed


def set_paragraph_rule(
    paragraph: ET.Element,
    *,
    indent: bool,
    before: int = 40,
    after: int = 40,
    line: int = 288,
    line_rule: str = "auto",
) -> None:
    ppr = paragraph.find(f"{NS}pPr")
    if ppr is None:
        ppr = ET.Element(f"{NS}pPr")
        paragraph.insert(0, ppr)
    for tag in (f"{NS}jc", f"{NS}spacing", f"{NS}ind"):
        old = ppr.find(tag)
        if old is not None:
            ppr.remove(old)
    spacing = ET.SubElement(ppr, f"{NS}spacing")
    spacing.set(f"{NS}before", str(before))
    spacing.set(f"{NS}after", str(after))
    spacing.set(f"{NS}line", str(line))
    spacing.set(f"{NS}lineRule", line_rule)
    if indent:
        ind = ET.SubElement(ppr, f"{NS}ind")
        ind.set(f"{NS}firstLine", "567")


def set_line_spacing(paragraph: ET.Element, *, line: int = 240, line_rule: str = "auto") -> None:
    ppr = paragraph.find(f"{NS}pPr")
    if ppr is None:
        ppr = ET.Element(f"{NS}pPr")
        paragraph.insert(0, ppr)
    spacing = ppr.find(f"{NS}spacing")
    if spacing is None:
        spacing = ET.Element(f"{NS}spacing")
        ppr.insert(0, spacing)
    spacing.set(f"{NS}line", str(line))
    spacing.set(f"{NS}lineRule", line_rule)


def set_alignment(paragraph: ET.Element, value: str) -> None:
    ppr = ensure_child(paragraph, f"{NS}pPr")
    jc = ppr.find(f"{NS}jc")
    if jc is None:
        jc = ET.SubElement(ppr, f"{NS}jc")
    jc.set(f"{NS}val", value)


def set_run_format(paragraph: ET.Element, *, size: int = 26, italic: bool = False, bold: bool | None = None) -> None:
    for run in paragraph.iter(f"{NS}r"):
        rpr = run.find(f"{NS}rPr")
        if rpr is None:
            rpr = ET.Element(f"{NS}rPr")
            run.insert(0, rpr)
        fonts = rpr.find(f"{NS}rFonts")
        if fonts is None:
            fonts = ET.Element(f"{NS}rFonts")
            rpr.insert(0, fonts)
        fonts.set(f"{NS}ascii", "Times New Roman")
        fonts.set(f"{NS}hAnsi", "Times New Roman")
        sz = rpr.find(f"{NS}sz")
        if sz is None:
            sz = ET.SubElement(rpr, f"{NS}sz")
        sz.set(f"{NS}val", str(size))
        for tag, enabled in ((f"{NS}i", italic), (f"{NS}b", bold)):
            node = rpr.find(tag)
            if enabled is True and node is None:
                ET.SubElement(rpr, tag)
            elif enabled is False and node is not None:
                rpr.remove(node)


def first_header_table(root: ET.Element) -> ET.Element | None:
    body = root.find(f"{NS}body")
    if body is None:
        return None
    return next((child for child in body if child.tag == f"{NS}tbl"), None)


def national_motto_rule_node(available_width_twips: int) -> ET.Element:
    width_twips = min(NATIONAL_MOTTO_RULE_WIDTH_TWIPS, max(1, available_width_twips))
    x_twips = max(0, (available_width_twips - width_twips) // 2)
    emu_width = width_twips * 635
    emu_x = x_twips * 635
    xml = f'''<w:sdt xmlns:w="{W}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
      <w:sdtPr><w:tag w:val="{NATIONAL_MOTTO_RULE_TAG}"/></w:sdtPr><w:sdtContent><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251659265" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>{emu_x}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>-12700</wp:posOffset></wp:positionV><wp:extent cx="{emu_width}" cy="{NATIONAL_MOTTO_RULE_HEIGHT_EMU}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="172" name="National motto rule"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="0"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{emu_width}" cy="{NATIONAL_MOTTO_RULE_HEIGHT_EMU}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="6350"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:prstDash val="solid"/></a:ln></wps:spPr><wps:style/><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p></w:sdtContent></w:sdt>'''
    return ET.fromstring(xml)


def normalize_national_header(root: ET.Element) -> int:
    table = first_header_table(root)
    if table is None:
        return 0
    rows = table.findall(f"{NS}tr")
    cells = rows[0].findall(f"{NS}tc") if rows else []
    if len(cells) < 2:
        return 0
    right_cell = cells[1]
    paragraphs = [child for child in right_cell if child.tag == f"{NS}p"]
    national = next(
        (paragraph for paragraph in paragraphs if re.match(r"^CỘNG HO[ÀÒ] XÃ HỘI CHỦ NGHĨA VIỆT NAM$", text_of(paragraph), re.IGNORECASE)),
        None,
    )
    motto = next((paragraph for paragraph in paragraphs if text_of(paragraph) == "Độc lập - Tự do - Hạnh phúc"), None)
    if national is None or motto is None:
        return 0

    changed = 0
    properties = right_cell.find(f"{NS}tcPr")
    paragraph_start = 1 if properties is not None else 0
    current_paragraphs = [child for child in right_cell if child.tag == f"{NS}p"]
    if current_paragraphs and current_paragraphs[0] is not national:
        right_cell.remove(national)
        right_cell.insert(paragraph_start, national)
        changed += 1
    current_paragraphs = [child for child in right_cell if child.tag == f"{NS}p"]
    national_index = current_paragraphs.index(national)
    if national_index + 1 >= len(current_paragraphs) or current_paragraphs[national_index + 1] is not motto:
        right_cell.remove(motto)
        right_cell.insert(paragraph_start + national_index + 1, motto)
        changed += 1

    for paragraph in (national, motto):
        before_format = ET.tostring(paragraph, encoding="utf-8")
        set_paragraph_rule(paragraph, indent=False, before=0, after=0, line=240, line_rule="auto")
        set_alignment(paragraph, "center")
        set_run_format(paragraph, size=26, italic=False, bold=True)
        if before_format != ET.tostring(paragraph, encoding="utf-8"):
            changed += 1

    # Note: national_motto_rule_node with floating wp:anchor inside table cells causes Word corruptions.
    # We do not insert it to keep the OpenXML valid and insertable by Office.js / Word COM.
    return changed


def normalize_sender_header_spacing(root: ET.Element) -> int:
    """Keep the issuing-agency block compact without changing body spacing."""
    table = first_header_table(root)
    if table is None:
        return 0
    rows = table.findall(f"{NS}tr")
    cells = rows[0].findall(f"{NS}tc") if rows else []
    if not cells:
        return 0

    changed = 0
    for paragraph in cells[0].iter(f"{NS}p"):
        if not text_of(paragraph):
            continue
        before_format = ET.tostring(paragraph, encoding="utf-8")
        set_line_spacing(paragraph)
        if before_format != ET.tostring(paragraph, encoding="utf-8"):
            changed += 1
    return changed


def replace_text(paragraph: ET.Element, value: str) -> None:
    nodes = list(paragraph.iter(f"{NS}t"))
    if not nodes:
        return
    nodes[0].text = value
    for node in nodes[1:]:
        node.text = ""


def normalize_vv(paragraph: ET.Element) -> bool:
    text = text_of(paragraph)
    if not re.match(r"^V/v\s*:??", text, re.IGNORECASE):
        return False
    new_text = re.sub(r"^V/v\s*:\s*", "V/v ", text, flags=re.IGNORECASE)
    if new_text.startswith("V/v ") and len(new_text) > 4:
        rest = new_text[4:]
        match = re.match(r"(\[?)([A-ZÀ-ỸĐ])", rest)
        if match:
            prefix, letter = match.groups()
            rest = prefix + letter.lower() + rest[match.end():]
        new_text = "V/v " + rest
    if new_text == text:
        return False
    replace_text(paragraph, new_text)
    return True


def normalize_legal_basis(paragraph: ET.Element, final: str) -> bool:
    text = text_of(paragraph)
    if not re.match(r"^Căn cứ(?:\s|$)", text, re.IGNORECASE):
        return False
    normalized = re.sub(r"[;,.]+\s*$", "", text).rstrip() + final
    changed = normalized != text
    replace_text(paragraph, normalized)
    set_paragraph_rule(paragraph, indent=False, before=0, after=120, line=360, line_rule="atLeast")
    set_alignment(paragraph, "left")
    set_run_format(paragraph, size=26, italic=True, bold=False)
    return changed


def normalize_recipients(root: ET.Element) -> int:
    changed = 0
    for cell in root.iter(f"{NS}tc"):
        paragraphs = list(cell.findall(f".//{NS}p"))
        label_index = next((i for i, p in enumerate(paragraphs) if text_of(p).lower().startswith("nơi nhận")), None)
        if label_index is None:
            continue
        label = paragraphs[label_index]
        if text_of(label) != "Nơi nhận:":
            replace_text(label, "Nơi nhận:")
            changed += 1
        set_paragraph_rule(label, indent=False, before=0, after=0, line=240, line_rule="auto")
        set_alignment(label, "left")
        set_run_format(label, size=24, italic=True, bold=True)
        has_archive = False
        for paragraph in paragraphs[label_index + 1:]:
            value = text_of(paragraph)
            if not value:
                continue
            clean_value = re.sub(r"^[-•]\s*", "", value).strip()
            if clean_value.lower().startswith("lưu"):
                if has_archive:
                    cell.remove(paragraph)
                    changed += 1
                    continue
                archive = re.sub(r"^Lưu\s*:\s*", "", clean_value, flags=re.IGNORECASE)
                archive = re.sub(r"[;,.]+\s*$", "", archive).strip() or "VT, Văn phòng, 01 bản"
                if archive.replace(" ", "").lower() in {"...,vp", "….,vp", "…,vp"}:
                    archive = "VT, Văn phòng, 01 bản"
                replace_text(paragraph, f"Lưu: {archive}.")
                has_archive = True
                changed += 1
            else:
                base = re.sub(r"[;,.]+\s*$", "", clean_value).strip()
                if not base:
                    base = "…"
                normalized = f"- {base};"
                if normalized != value:
                    replace_text(paragraph, normalized)
                    changed += 1
            set_paragraph_rule(paragraph, indent=False, before=0, after=0, line=240, line_rule="auto")
            set_alignment(paragraph, "left")
            set_run_format(paragraph, size=22, italic=False, bold=False)
        if not has_archive:
            archive = ET.Element(f"{NS}p")
            run = ET.SubElement(archive, f"{NS}r")
            text_node = ET.SubElement(run, f"{NS}t")
            text_node.text = "Lưu: VT, Văn phòng, 01 bản."
            cell.append(archive)
            set_paragraph_rule(archive, indent=False, before=0, after=0, line=240, line_rule="auto")
            set_alignment(archive, "left")
            set_run_format(archive, size=22, italic=False, bold=False)
            changed += 1
    return changed


def is_structural(text: str) -> bool:
    upper = text.upper()
    if not text or text.startswith(BODY_SKIP_PREFIXES):
        return True
    if ", ngày " in text.lower() or "ngày " in text.lower() and "tháng" in text.lower():
        return True
    if upper in DOCUMENT_TYPES or upper == "ĐẢNG CỘNG SẢN VIỆT NAM":
        return True
    if len(text) < 100 and text == upper and any(ch.isalpha() for ch in text):
        return True
    if re.match(r"^(Điều|Phần|Chương|Mục|Tiểu mục)\s+", text, re.IGNORECASE):
        return True
    return False


def title_rule_node(text: str) -> ET.Element:
    available = 468.0
    text_width = max(1.0, max((len(line.strip()) for line in text.splitlines()), default=1) * 13.0 * 0.52)
    width = min(available, text_width * 0.4)
    x = max(0.0, (available - width) / 2)
    emu_width = round(width * 12700)
    emu_x = round(x * 12700)
    xml = f'''<w:sdt xmlns:w="{W}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
      <w:sdtPr><w:tag w:val="TVCI_HRULE:TITLE_ABSTRACT"/></w:sdtPr><w:sdtContent><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>{emu_x}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>-12700</wp:posOffset></wp:positionV><wp:extent cx="{emu_width}" cy="6350"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="171" name="TVCI title rule"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="0"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{emu_width}" cy="6350"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="6350"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:prstDash val="solid"/></a:ln></wps:spPr><wps:style/><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p></w:sdtContent></w:sdt>'''
    return ET.fromstring(xml)


def add_title_rules(root: ET.Element) -> int:
    # Note: title_rule_node with floating wp:anchor causes Word corruptions.
    return 0


def normalize_document(path: Path) -> tuple[bytes, int]:
    with zipfile.ZipFile(path) as source:
        xml = source.read("word/document.xml")
    root = ET.fromstring(xml)
    party = path.name.lower() == "dang-sample.docx"
    changed = 1
    set_page_setup(root)
    changed += expand_header_tables(root)
    changed += normalize_national_header(root)
    changed += normalize_sender_header_spacing(root)
    for paragraph in all_paragraphs(root):
        if normalize_vv(paragraph):
            changed += 1
    changed += add_title_rules(root)
    for paragraph in direct_body_paragraphs(root):
        text = text_of(paragraph)
        if normalize_vv(paragraph):
            changed += 1
            text = text_of(paragraph)
        if re.match(r"^Căn cứ(?:\s|$)", text, re.IGNORECASE):
            continue
        if is_structural(text):
            continue
        set_paragraph_rule(paragraph, indent=True)
        set_alignment(paragraph, "both")
        set_run_format(paragraph, size=26, italic=False)
        changed += 1
    legal = [p for p in all_paragraphs(root) if re.match(r"^Căn cứ(?:\s|$)", text_of(p), re.IGNORECASE)]
    for index, paragraph in enumerate(legal):
        if normalize_legal_basis(paragraph, "," if party and index == len(legal) - 1 else ";" if index < len(legal) - 1 else "."):
            changed += 1
    changed += normalize_recipients(root)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True), changed


def normalize_national_header_document(path: Path) -> tuple[bytes, int]:
    with zipfile.ZipFile(path) as source:
        xml = source.read("word/document.xml")
    root = ET.fromstring(xml)
    changed = normalize_national_header(root)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True), changed


def template_paths(root: Path) -> list[Path]:
    return sorted(path for path in root.glob("**/*.docx") if path.name.lower() not in ACTIVE_EXCLUDED)


def header_template_paths(root: Path) -> list[Path]:
    return sorted(path for path in root.glob("**/*.docx") if path.name.lower() != "dang-sample.docx")


def rewrite_package(path: Path, document_xml: bytes) -> None:
    with zipfile.ZipFile(path, "r") as source:
        entries = [(info, source.read(info.filename)) for info in source.infolist()]
    with tempfile.NamedTemporaryFile(prefix="tvci-format-", suffix=".docx", dir=path.parent, delete=False) as handle:
        temporary = Path(handle.name)
    try:
        with zipfile.ZipFile(temporary, "w") as target:
            for info, data in entries:
                target.writestr(info, document_xml if info.filename == "word/document.xml" else data)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def check_document(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as source:
        root = ET.fromstring(source.read("word/document.xml"))
    errors: list[str] = []
    section = root.find(f".//{NS}sectPr")
    size = section.find(f"{NS}pgSz") if section is not None else None
    margins = section.find(f"{NS}pgMar") if section is not None else None
    if size is None or size.get(f"{NS}w") != "11906" or size.get(f"{NS}h") != "16838":
        errors.append("not A4")
    if margins is None or any(margins.get(f"{NS}{key}") != value for key, value in (("top", "1134"), ("bottom", "1134"), ("left", "1701"), ("right", "850"))):
        errors.append("margins are not 20-20-30-15mm")
    body = root.find(f"{NS}body")
    header_tables = [child for child in body if child.tag == f"{NS}tbl"][:2] if body is not None else []
    if len(header_tables) == 2:
        for index, table in enumerate(header_tables, start=1):
            properties = table.find(f"{NS}tblPr")
            description = properties.find(f"{NS}tblDescription") if properties is not None else None
            marker = description.get(f"{NS}val") if description is not None else None
            if marker not in {HEADER_TABLE_MARKER, HEADER_TABLE_MARKER_LEFT}:
                errors.append(f"header table {index} is not expanded")
    if header_tables:
        first_table = header_tables[0]
        rows = first_table.findall(f"{NS}tr")
        cells = rows[0].findall(f"{NS}tc") if rows else []
        if len(cells) >= 2:
            right_cell = cells[1]
            paragraphs = [child for child in right_cell if child.tag == f"{NS}p" and text_of(child)]
            if not paragraphs or not re.match(r"^CỘNG HO[ÀÒ] XÃ HỘI CHỦ NGHĨA VIỆT NAM$", text_of(paragraphs[0]), re.IGNORECASE):
                errors.append("national name is not first in the header")
            motto = next((paragraph for paragraph in paragraphs if text_of(paragraph) == "Độc lập - Tự do - Hạnh phúc"), None)
            if motto is None:
                errors.append("national motto is missing")
            else:
                motto_index = list(right_cell).index(motto)
                rule_after_motto = next(
                    (tag for tag in list(right_cell)[motto_index + 1:] if tag.find(f".//{NS}tag") is not None),
                    None,
                )
                if rule_after_motto is None or not any(
                    tag.get(f"{NS}val") == NATIONAL_MOTTO_RULE_TAG for tag in rule_after_motto.iter(f"{NS}tag")
                ):
                    errors.append("national motto rule is missing")
    for paragraph in direct_body_paragraphs(root):
        text = text_of(paragraph)
        if not text or is_structural(text):
            continue
        ppr = paragraph.find(f"{NS}pPr")
        spacing = ppr.find(f"{NS}spacing") if ppr is not None else None
        ind = ppr.find(f"{NS}ind") if ppr is not None else None
        if (
            spacing is None
            or spacing.get(f"{NS}before") != "40"
            or spacing.get(f"{NS}after") != "40"
            or spacing.get(f"{NS}line") != "288"
            or spacing.get(f"{NS}lineRule") != "auto"
        ):
            errors.append(f"body spacing: {text[:30]}")
        if ind is None or ind.get(f"{NS}firstLine") != "567":
            errors.append(f"body indent: {text[:30]}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply the active IEMM/Party/TVCI page and body baseline to bundled DOCX templates.")
    parser.add_argument("--root", type=Path, default=Path("templates"))
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    paths = template_paths(args.root)
    header_paths = header_template_paths(args.root)
    if not args.check:
        changed_files = 0
        for path in paths:
            document, changed = normalize_document(path)
            if changed:
                rewrite_package(path, document)
                changed_files += 1
        for path in header_paths:
            if path in paths:
                continue
            document, changed = normalize_national_header_document(path)
            if changed:
                rewrite_package(path, document)
                changed_files += 1
        print(f"Updated {changed_files} of {len(header_paths)} bundled templates.")
    failures = [(path, check_document(path)) for path in paths]
    failures = [(path, errors) for path, errors in failures if errors]
    if failures:
        for path, errors in failures:
            print(f"{path}: {', '.join(errors)}")
        return 1
    print(f"Checked {len(paths)} active templates: IEMM/Party page and body baseline is valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
