from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


EXPECTED_FILES = {
    "01-quyet-dinh-ca-biet.docx",
    "02-quyet-dinh-ban-hanh-van-ban.docx",
    "03-quy-che-quy-dinh.docx",
    "04-van-ban-ban-hanh-kem-theo-quyet-dinh.docx",
    "05-cong-van-hanh-chinh.docx",
    "06-thong-bao-noi-bo-vien.docx",
    "07-to-trinh-cua-vien.docx",
    "08-to-trinh-cua-don-vi-gui-vien.docx",
    "09-bien-ban.docx",
    "10-van-ban-chung.docx",
    "11-ban-sao-van-ban.docx",
    "12-thu-moi-hop.docx",
    "13-thu-bao-hoan-hop.docx",
    "14-cong-van-dinh-chinh.docx",
}

OLD_LABEL = "Mẫu văn bản TVCI".encode("utf-8")
NEW_LABEL = "Mẫu văn bản IEMM".encode("utf-8")


def patch_footer_branding(path: Path) -> int:
    with ZipFile(path, "r") as source:
        entries = [(info, source.read(info.filename)) for info in source.infolist()]

    replacements = 0
    patched_entries = []
    for info, data in entries:
        if info.filename.startswith("word/footer") and info.filename.endswith(".xml"):
            replacements += data.count(OLD_LABEL)
            data = data.replace(OLD_LABEL, NEW_LABEL)
        patched_entries.append((info, data))

    if replacements == 0:
        raise ValueError(f"No TVCI footer label found in {path}")

    temporary_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            dir=path.parent, prefix=f".{path.stem}-", suffix=".docx", delete=False
        ) as temporary:
            temporary_path = temporary.name
        with ZipFile(temporary_path, "w", compression=ZIP_DEFLATED) as destination:
            for info, data in patched_entries:
                destination.writestr(info, data)
        os.replace(temporary_path, path)
        temporary_path = None
    finally:
        if temporary_path:
            os.unlink(temporary_path)
    return replacements


def main() -> int:
    template_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("templates/iemm")
    actual_files = {path.name for path in template_dir.glob("*.docx")}
    if actual_files != EXPECTED_FILES:
        missing = sorted(EXPECTED_FILES - actual_files)
        unexpected = sorted(actual_files - EXPECTED_FILES)
        raise SystemExit(f"Unexpected IEMM template set; missing={missing}, unexpected={unexpected}")

    total_replacements = 0
    for name in sorted(EXPECTED_FILES):
        path = template_dir / name
        total_replacements += patch_footer_branding(path)
    print(f"Patched {len(EXPECTED_FILES)} IEMM templates ({total_replacements} footer labels)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
