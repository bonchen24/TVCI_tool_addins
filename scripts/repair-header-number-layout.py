from __future__ import annotations

import argparse
import html
import re
import sys
import tempfile
import zipfile
from pathlib import Path


DOCUMENT_XML = "word/document.xml"
TABLE_RE = re.compile(r"<w:tbl\b[^>]*>.*?</w:tbl>", re.DOTALL)
CELL_RE = re.compile(r"<w:tc\b[^>]*>.*?</w:tc>", re.DOTALL)
PARAGRAPH_RE = re.compile(r"<w:p\b[^>]*>.*?</w:p>", re.DOTALL)
TEXT_RE = re.compile(r"<w:t(?: [^>]*)?>(.*?)</w:t>", re.DOTALL)
DATE_RULE_EXTENT_RE = re.compile(r"<[^>]*:extent\b[^>]*\bcy=\"9000\"")
UNDERSCORE_RE = re.compile(r"^_+$")


def paragraph_text(paragraph: str) -> str:
    return html.unescape("".join(TEXT_RE.findall(paragraph))).strip()


def center_paragraph(paragraph: str) -> str:
    paragraph_properties = re.search(r"<w:pPr\b[^>]*>.*?</w:pPr>", paragraph, re.DOTALL)
    if paragraph_properties:
        properties = paragraph_properties.group(0)
        if re.search(r"<w:jc\b[^>]*/>", properties):
            properties = re.sub(r"<w:jc\b[^>]*/>", '<w:jc w:val="center"/>', properties, count=1)
        elif re.search(r"<w:jc\b[^>]*>.*?</w:jc>", properties, re.DOTALL):
            properties = re.sub(
                r"<w:jc\b[^>]*>.*?</w:jc>",
                '<w:jc w:val="center"/>',
                properties,
                count=1,
                flags=re.DOTALL,
            )
        else:
            properties = properties[:-len("</w:pPr>")] + '<w:jc w:val="center"/>' + "</w:pPr>"
        return paragraph.replace(paragraph_properties.group(0), properties, 1)

    empty_properties = re.search(r"<w:pPr\b[^>]*/>", paragraph)
    if empty_properties:
        return paragraph.replace(empty_properties.group(0), '<w:pPr><w:jc w:val="center"/></w:pPr>', 1)

    first_run = re.search(r"<w:r\b", paragraph)
    if not first_run:
        return paragraph
    return paragraph[: first_run.start()] + '<w:pPr><w:jc w:val="center"/></w:pPr>' + paragraph[first_run.start() :]


def header_date_cell(xml: str) -> tuple[str, str] | None:
    first_table = TABLE_RE.search(xml)
    if not first_table:
        return None
    cells = list(CELL_RE.finditer(first_table.group(0)))
    if len(cells) < 2:
        return None
    return first_table.group(0), cells[1].group(0)


def is_date_rule_paragraph(paragraph: str) -> bool:
    text = paragraph_text(paragraph)
    return bool(UNDERSCORE_RE.fullmatch(text)) or "Header rule" in paragraph or DATE_RULE_EXTENT_RE.search(paragraph) is not None


def remove_date_rule(xml: str) -> tuple[str, bool]:
    header = header_date_cell(xml)
    if not header:
        return xml, False
    first_table, right_cell = header
    updated_cell = right_cell
    removed = False
    for paragraph in PARAGRAPH_RE.findall(right_cell):
        if not is_date_rule_paragraph(paragraph):
            continue
        updated_cell = updated_cell.replace(paragraph, "", 1)
        removed = True
    if not removed:
        return xml, False
    updated_table = first_table.replace(right_cell, updated_cell, 1)
    return xml.replace(first_table, updated_table, 1), True


def number_cell(xml: str) -> tuple[str, str, str] | None:
    for table in TABLE_RE.findall(xml):
        for cell in CELL_RE.findall(table):
            if "Số:" not in cell:
                continue
            number_paragraph = next(
                (paragraph for paragraph in PARAGRAPH_RE.findall(cell) if paragraph_text(paragraph).startswith("Số:")),
                None,
            )
            if number_paragraph:
                return table, cell, number_paragraph
    return None


def vv_paragraphs(xml: str) -> list[str]:
    return [paragraph for paragraph in PARAGRAPH_RE.findall(xml) if paragraph_text(paragraph).startswith("V/v")]


def repair_document(xml: str) -> tuple[str, bool]:
    changed = False
    xml, date_changed = remove_date_rule(xml)
    changed |= date_changed

    context = number_cell(xml)
    if not context:
        return xml, changed
    table, cell, number_paragraph = context
    centered_number = center_paragraph(number_paragraph)
    updated_cell = cell.replace(number_paragraph, centered_number, 1)
    changed |= centered_number != number_paragraph

    cell_vv = next((paragraph for paragraph in PARAGRAPH_RE.findall(updated_cell) if paragraph_text(paragraph).startswith("V/v")), None)
    if cell_vv:
        centered_vv = center_paragraph(cell_vv)
        updated_cell = updated_cell.replace(cell_vv, centered_vv, 1)
        changed |= centered_vv != cell_vv
    else:
        source_vv = next(
            (paragraph for paragraph in vv_paragraphs(xml) if paragraph not in updated_cell),
            None,
        )
        if source_vv:
            centered_vv = center_paragraph(source_vv)
            xml = xml.replace(source_vv, "", 1)
            updated_cell = updated_cell.replace(centered_number, centered_number + centered_vv, 1)
            changed = True

    updated_table = table.replace(cell, updated_cell, 1)
    xml = xml.replace(table, updated_table, 1)
    return xml, changed


def template_paths(root: Path) -> list[Path]:
    return sorted(root.glob("**/*.docx"))


def read_document(path: Path) -> bytes:
    with zipfile.ZipFile(path) as archive:
        return archive.read(DOCUMENT_XML)


def write_document(path: Path, document: bytes) -> None:
    with zipfile.ZipFile(path, "r") as source:
        entries = [(info, source.read(info.filename)) for info in source.infolist()]
    updated: list[tuple[zipfile.ZipInfo, bytes]] = []
    for info, data in entries:
        updated.append((info, document if info.filename == DOCUMENT_XML else data))

    with tempfile.NamedTemporaryFile(prefix="tvci-header-", suffix=".docx", dir=path.parent, delete=False) as handle:
        temporary = Path(handle.name)
    try:
        with zipfile.ZipFile(temporary, "w") as target:
            for info, data in updated:
                target.writestr(info, data)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def has_date_rule(xml: str) -> bool:
    header = header_date_cell(xml)
    if not header:
        return False
    _, right_cell = header
    return any(is_date_rule_paragraph(paragraph) for paragraph in PARAGRAPH_RE.findall(right_cell))


def check_document(path: Path) -> list[str]:
    xml = read_document(path).decode("utf-8")
    errors: list[str] = []
    if has_date_rule(xml):
        errors.append("date rule remains")
    context = number_cell(xml)
    if not context:
        return errors
    _, cell, number_paragraph = context
    if not re.search(r'<w:jc\s+w:val="center"\s*/>', number_paragraph):
        errors.append("Số is not centered")
    document_has_vv = bool(vv_paragraphs(xml))
    if document_has_vv:
        paragraphs = [paragraph_text(paragraph) for paragraph in PARAGRAPH_RE.findall(cell)]
        number_index = next((index for index, text in enumerate(paragraphs) if text.startswith("Số:")), -1)
        if number_index < 0 or number_index + 1 >= len(paragraphs) or not paragraphs[number_index + 1].startswith("V/v"):
            errors.append("V/v is not immediately below Số")
    return errors


def check_templates(paths: list[Path]) -> int:
    failures: list[tuple[Path, list[str]]] = []
    for path in paths:
        errors = check_document(path)
        if errors:
            failures.append((path, errors))
    if failures:
        for path, errors in failures:
            print(f"{path}: {', '.join(errors)}")
        return 1
    print(f"Checked {len(paths)} templates: header number/date layout is valid.")
    return 0


def apply_template(path: Path) -> bool:
    original = read_document(path)
    updated, changed = repair_document(original.decode("utf-8"))
    if not changed:
        return False
    write_document(path, updated.encode("utf-8"))
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Align header number and V/v fields and remove date-area rules.")
    parser.add_argument("--root", type=Path, default=Path("templates"))
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    paths = template_paths(args.root)
    if args.check:
        return check_templates(paths)
    changed = sum(apply_template(path) for path in paths)
    print(f"Updated {changed} of {len(paths)} templates.")
    return check_templates(paths)


if __name__ == "__main__":
    sys.exit(main())
