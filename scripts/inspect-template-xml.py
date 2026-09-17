from pathlib import Path
import sys
from zipfile import ZipFile
from lxml import etree

sys.stdout.reconfigure(encoding="utf-8")

for path in sorted(Path("templates").rglob("*.docx")):
    with ZipFile(path) as archive:
        root = etree.fromstring(archive.read("word/document.xml"))
    paragraphs = []
    for paragraph in root.xpath("//*[local-name()='p']"):
        text = "".join(paragraph.xpath(".//*[local-name()='t']/text()"))
        if text.strip():
            paragraphs.append(text)
    print(f"\n{path}")
    for index, text in enumerate(paragraphs):
        print(f"{index:02d}: {text}")
