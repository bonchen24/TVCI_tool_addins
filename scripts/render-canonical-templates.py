#!/usr/bin/env python3
"""Render canonical DOCX files through LibreOffice and record PDF/image geometry checks."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import pymupdf


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SPEC = ROOT / "templates" / "specs" / "administrative-templates.v1.json"
DEFAULT_INPUT = ROOT / "canonical_templates" / "generated"
DEFAULT_OUTPUT = ROOT / "qa" / "canonical-template-renders"
DEFAULT_REPORT = ROOT / "qa" / "canonical-template-reports" / "visual.json"
MM_PER_POINT = 25.4 / 72


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def find_libreoffice() -> str:
    candidates = [
        shutil.which("soffice"),
        shutil.which("soffice.exe"),
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return str(candidate)
    raise FileNotFoundError("LibreOffice soffice executable was not found; visual QA cannot be marked passed.")


def renderer_identity(executable: str) -> dict[str, str]:
    if sys.platform == "win32":
        powershell = shutil.which("powershell") or shutil.which("powershell.exe")
        if powershell:
            quoted_path = executable.replace("'", "''")
            command = f"(Get-Item -LiteralPath '{quoted_path}').VersionInfo.ProductVersion"
            result = subprocess.run(
                [powershell, "-NoProfile", "-NonInteractive", "-Command", command],
                capture_output=True,
                text=True,
                timeout=20,
                check=False,
            )
            if result.returncode == 0 and result.stdout.strip():
                return {"name": "LibreOffice", "version": result.stdout.strip(), "executable": executable}
    with tempfile.TemporaryDirectory(prefix="canonical-docx-lo-version-") as profile:
        result = subprocess.run(
            [executable, f"-env:UserInstallation={Path(profile).resolve().as_uri()}", "--version"],
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
    if result.returncode != 0:
        raise RuntimeError(f"Could not identify LibreOffice renderer: {result.stdout}\n{result.stderr}")
    version = (result.stdout or result.stderr).strip().splitlines()[0]
    return {"name": "LibreOffice", "version": version, "executable": executable}


def render_documents(paths: list[Path], output_dir: Path, renderer: str) -> list[dict[str, str]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    profile = output_dir / ".libreoffice-profile"
    profile.mkdir(parents=True, exist_ok=True)
    expected = {path.stem: output_dir / f"{path.stem}.pdf" for path in paths}
    for pdf_path in expected.values():
        if pdf_path.exists():
            pdf_path.unlink()
    profile_uri = profile.resolve().as_uri()
    command = [
        renderer,
        "--headless",
        f"-env:UserInstallation={profile_uri}",
        "--convert-to",
        "pdf",
        "--outdir",
        str(output_dir),
        *[str(path) for path in paths],
    ]
    result = subprocess.run(command, capture_output=True, text=True, timeout=240, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"LibreOffice render failed ({result.returncode}):\n{result.stdout}\n{result.stderr}")
    missing = [str(path) for path in expected.values() if not path.is_file()]
    if missing:
        raise RuntimeError(f"LibreOffice did not create expected PDFs: {missing}\n{result.stdout}\n{result.stderr}")
    return [
        {"sourceDocx": str(source), "pdfPath": str(expected[source.stem])}
        for source in paths
    ]


def _intersection(left: tuple[float, float, float, float], right: tuple[float, float, float, float]) -> tuple[float, float]:
    width = max(0.0, min(left[2], right[2]) - max(left[0], right[0]))
    height = max(0.0, min(left[3], right[3]) - max(left[1], right[1]))
    return width, height


def _text_blocks(page) -> list[dict[str, Any]]:
    blocks = []
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            text = "".join(span["text"] for span in line.get("spans", [])).strip()
            if text:
                blocks.append({"bbox": tuple(float(value) for value in line["bbox"]), "text": text})
    return blocks


def _page_number_at_top_center(page) -> str | None:
    center = page.rect.width / 2
    candidates = []
    for word in page.get_text("words"):
        x0, y0, x1, y1, text = word[:5]
        if y1 <= 48 and abs(((x0 + x1) / 2) - center) <= 18:
            candidates.append((y0, text.strip()))
    candidates.sort()
    return candidates[0][1] if candidates else None


def analyze_pdf(pdf_path: Path, image_dir: Path, template_key: str, organization: dict[str, Any] | None = None, header_mode: str = "administrative") -> dict[str, Any]:
    pdf_path = Path(pdf_path)
    image_dir = Path(image_dir)
    image_dir.mkdir(parents=True, exist_ok=True)
    pdf = pymupdf.open(pdf_path)
    pages = []
    images = []
    for index, page in enumerate(pdf):
        rect = page.rect
        blocks = _text_blocks(page)
        geometry_findings = []
        for block in blocks:
            x0, y0, x1, y1 = block["bbox"]
            if x0 < 1 or y0 < 1 or x1 > rect.width - 1 or y1 > rect.height - 1:
                geometry_findings.append({"code": "clipped-text", "text": block["text"][:80], "bbox": block["bbox"]})
        for left_index, left in enumerate(blocks):
            for right in blocks[left_index + 1 :]:
                width, height = _intersection(left["bbox"], right["bbox"])
                if width > 4 and height > 3:
                    geometry_findings.append({
                        "code": "overlapping-text",
                        "left": left["text"][:80],
                        "right": right["text"][:80],
                    })

        width_mm = rect.width * MM_PER_POINT
        height_mm = rect.height * MM_PER_POINT
        if abs(width_mm - 210) > 0.5 or abs(height_mm - 297) > 0.5:
            geometry_findings.append({"code": "wrong-pdf-page-size", "widthMm": width_mm, "heightMm": height_mm})

        text_all = " ".join(" ".join(block["text"].split()) for block in blocks)
        if organization is not None:
            parent_present = " ".join(organization["parentAgency"].split()) in text_all
            national_present = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" in text_all
        if header_mode != "internal" and organization is not None:
            page_center = rect.width / 2
            header_words = [
                word for word in page.get_text("words")
                if 40 < word[1] < 125 and word[3] < 130
            ]
            left_header_words = [word for word in header_words if (word[0] + word[2]) / 2 < page_center]
            right_header_words = [word for word in header_words if (word[0] + word[2]) / 2 > page_center]
            if not parent_present or not national_present or not left_header_words or not right_header_words:
                geometry_findings.append({"code": "header-column-missing", "message": "Left/right administrative header columns were not both rendered."})
            elif abs(min(word[1] for word in left_header_words) - min(word[1] for word in right_header_words)) > 10:
                geometry_findings.append({"code": "header-unbalanced", "message": "Left and right header columns start at different vertical positions."})

        recipients = next((block for block in blocks if "Nơi nhận:" in block["text"]), None)
        signer = next((block for block in blocks if "{CHUC_VU_NGUOI_KY}" in block["text"]), None)
        if recipients and signer:
            width, height = _intersection(recipients["bbox"], signer["bbox"])
            if width > 2 and height > 2:
                geometry_findings.append({"code": "recipient-signature-overlap"})

        page_number = _page_number_at_top_center(page)
        if index == 0 and page_number == "1":
            geometry_findings.append({"code": "first-page-number-visible"})
        if index > 0 and page_number != str(index + 1):
            geometry_findings.append({"code": "missing-continuation-page-number", "expected": str(index + 1), "actual": page_number})

        pixmap = page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), alpha=False)
        image_path = image_dir / f"{template_key}-page-{index + 1}.png"
        pixmap.save(image_path)
        relative_image_path = image_path.name
        images.append({"path": relative_image_path, "sha256": sha256_file(image_path), "width": pixmap.width, "height": pixmap.height})
        pages.append({
            "number": index + 1,
            "widthMm": round(width_mm, 3),
            "heightMm": round(height_mm, 3),
            "textBlockCount": len(blocks),
            "geometryFindings": geometry_findings,
            "pageNumberAtTopCenter": page_number,
        })

    pdf.close()
    return {
        "pdfPath": str(pdf_path),
        "pdfSha256": sha256_file(pdf_path),
        "pageCount": len(pages),
        "pages": pages,
        "pageImages": images,
    }


def render_all(spec: dict[str, Any], input_dir: Path, output_dir: Path) -> dict[str, Any]:
    executable = find_libreoffice()
    identity = renderer_identity(executable)
    output_dir = Path(output_dir)
    pdf_dir = output_dir / "pdf"
    image_dir = output_dir / "images"
    inputs = [Path(input_dir) / template["canonicalFile"] for template in spec["templates"]]
    missing = [str(path) for path in inputs if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"Canonical DOCX files are missing: {missing}")
    rendered = render_documents(inputs, pdf_dir, executable)
    rendered_by_stem = {Path(item["sourceDocx"]).stem: Path(item["pdfPath"]) for item in rendered}
    results = []
    for template in spec["templates"]:
        organization = spec["organizations"][template["organization"]]
        header_mode = spec["documentTypes"][template["typeSchema"]].get("headerMode", "administrative")
        analysis = analyze_pdf(
            rendered_by_stem[Path(template["canonicalFile"]).stem],
            image_dir,
            template["key"],
            organization,
            header_mode,
        )
        image_records = [dict(image, path=f"images/{image['path']}") for image in analysis.pop("pageImages")]
        failures = [finding for page in analysis["pages"] for finding in page["geometryFindings"]]
        report_relative = f"pdf/{rendered_by_stem[Path(template['canonicalFile']).stem].name}"
        visual = {
            "status": "passed" if not failures else "failed",
            "renderer": identity["name"],
            "rendererVersion": identity["version"],
            "reportPath": None,
            "sha256": None,
        }
        results.append({
            "templateKey": template["key"],
            "canonicalFile": template["canonicalFile"],
            "canonicalSha256": sha256_file(Path(input_dir) / template["canonicalFile"]),
            "pdfPath": report_relative,
            "pdfSha256": analysis["pdfSha256"],
            "pages": analysis["pages"],
            "pageImages": image_records,
            "status": visual["status"],
            "visualQa": visual,
            "findings": failures,
        })
    return {
        "ruleSpecVersion": spec["ruleSpecVersion"],
        "renderer": identity,
        "representativeSet": [template["key"] for template in spec["templates"]],
        "status": "passed" if all(item["visualQa"]["status"] == "passed" for item in results) else "failed",
        "templates": results,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true", help="render and check every spec-declared canonical document")
    parser.add_argument("--spec", type=Path, default=DEFAULT_SPEC)
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args(argv)
    if not args.all:
        parser.error("Pass --all to render and inspect every canonical DOCX template.")
    spec = json.loads(args.spec.read_text(encoding="utf-8"))
    report = render_all(spec, args.input_dir, args.output_dir)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8", newline="\n")
    failed = sum(item["visualQa"]["status"] != "passed" for item in report["templates"])
    print(f"Visual render QA: {report['status']} ({len(report['templates']) - failed}/{len(report['templates'])} passed), {report['renderer']['version']}. Report: {args.report}")
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
