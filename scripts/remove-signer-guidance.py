from __future__ import annotations

import argparse
import re
import sys
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
TEXT_TAG = f"{{{WORD_NS}}}t"
ET.register_namespace("w", WORD_NS)
ET.register_namespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
ET.register_namespace("mc", "http://schemas.openxmlformats.org/markup-compatibility/2006")
SIGNER_GUIDANCE = re.compile(
    r"\(\s*(?:ký\s*,\s*ghi\s*rõ\s*họ\s*tên(?:\s*,\s*đóng\s*dấu)?|ký\s+và\s+đóng\s+dấu)\s*\)",
    re.IGNORECASE,
)


def has_signer_guidance(xml: bytes) -> bool:
    root = ET.fromstring(xml)
    for paragraph in root.iter(f"{{{WORD_NS}}}p"):
        text = "".join(paragraph.itertext())
        if SIGNER_GUIDANCE.search(" ".join(text.split())):
            return True
    return False


def remove_signer_guidance(xml: bytes) -> tuple[bytes, int]:
    root = ET.fromstring(xml)
    removed = 0
    for paragraph in root.iter(f"{{{WORD_NS}}}p"):
        text = "".join(paragraph.itertext())
        if not SIGNER_GUIDANCE.search(" ".join(text.split())):
            continue
        for text_node in paragraph.iter(TEXT_TAG):
            text_node.text = ""
        removed += 1
    if not removed:
        return xml, 0
    return ET.tostring(root, encoding="utf-8", xml_declaration=True), removed


def template_paths(root: Path) -> list[Path]:
    return sorted(root.glob("**/*.docx"))


def check_templates(paths: list[Path]) -> int:
    failures: list[Path] = []
    for path in paths:
        with zipfile.ZipFile(path) as archive:
            document = archive.read("word/document.xml")
        if has_signer_guidance(document):
            failures.append(path)
    if failures:
        for path in failures:
            print(f"Signer guidance remains: {path}")
        return 1
    print(f"Checked {len(paths)} templates: no signer guidance remains.")
    return 0


def apply_template(path: Path) -> int:
    with zipfile.ZipFile(path, "r") as source:
        entries = [(info, source.read(info.filename)) for info in source.infolist()]
    changed = 0
    updated: list[tuple[zipfile.ZipInfo, bytes]] = []
    for info, data in entries:
        if info.filename == "word/document.xml":
            data, removed = remove_signer_guidance(data)
            changed += removed
        updated.append((info, data))
    if not changed:
        return 0

    with tempfile.NamedTemporaryFile(prefix="tvci-signer-", suffix=".docx", dir=path.parent, delete=False) as handle:
        temporary = Path(handle.name)
    try:
        with zipfile.ZipFile(temporary, "w") as target:
            for info, data in updated:
                target.writestr(info, data)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)
    return changed


def normalize_template_prefixes(path: Path) -> None:
    with zipfile.ZipFile(path, "r") as source:
        entries = [(info, source.read(info.filename)) for info in source.infolist()]
    updated: list[tuple[zipfile.ZipInfo, bytes]] = []
    for info, data in entries:
        if info.filename == "word/document.xml":
            data = ET.tostring(ET.fromstring(data), encoding="utf-8", xml_declaration=True)
        updated.append((info, data))
    with tempfile.NamedTemporaryFile(prefix="tvci-namespace-", suffix=".docx", dir=path.parent, delete=False) as handle:
        temporary = Path(handle.name)
    try:
        with zipfile.ZipFile(temporary, "w") as target:
            for info, data in updated:
                target.writestr(info, data)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Remove signer instruction text from bundled DOCX templates.")
    parser.add_argument("--root", type=Path, default=Path("templates"))
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--normalize-prefixes", action="store_true")
    args = parser.parse_args()
    paths = template_paths(args.root)
    if args.normalize_prefixes:
        for path in paths:
            normalize_template_prefixes(path)
    if args.check:
        return check_templates(paths)
    changed = sum(apply_template(path) for path in paths)
    print(f"Removed {changed} signer guidance blocks from {len(paths)} templates.")
    return check_templates(paths)


if __name__ == "__main__":
    sys.exit(main())
