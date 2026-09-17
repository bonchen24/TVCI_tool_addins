import glob, os, re, tempfile, zipfile
from pathlib import Path

ROOT_TAG = (
    '<w:document '
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
    'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" '
    'xmlns:v="urn:schemas-microsoft-com:vml" '
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
    'xmlns:w10="urn:schemas-microsoft-com:office:word" '
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" '
    'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" '
    'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" '
    'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
    'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
    'mc:Ignorable="w14 wp14">'
)

AC_PATTERN = re.compile(
    r'<mc:AlternateContent\b[^>]*>.*?<mc:Choice\b[^>]*>(<w:drawing\b.*?</w:drawing>)</mc:Choice>.*?<mc:Fallback\b[^>]*>.*?</mc:Fallback>.*?</mc:AlternateContent>',
    re.DOTALL
)

def repair_xml(xml: str) -> str:
    # 1. Unwrap AlternateContent with wps Choice and VML Fallback
    xml = AC_PATTERN.sub(r'\1', xml)
    
    # 2. Map synthetic ns prefixes
    xml = re.sub(r'\bns2:', 'w14:', xml)
    xml = re.sub(r'\bns4:', 'wp14:', xml)
    xml = re.sub(r'\bns5:', 'v:', xml)
    xml = re.sub(r'\bns6:', 'o:', xml)
    xml = re.sub(r'\bns7:', 'v:', xml)
    xml = re.sub(r'\bns8:', 'o:', xml)
    xml = re.sub(r'\bns9:', 'w10:', xml)
    
    # 3. Replace <w:document ...> root tag
    xml = re.sub(r'<w:document\b[^>]*>', ROOT_TAG, xml, count=1)
    return xml

def repair_docx(path: Path):
    with zipfile.ZipFile(path, 'r') as z:
        entries = [(info, z.read(info.filename)) for info in z.infolist()]
    
    modified = False
    new_entries = []
    for info, data in entries:
        if info.filename == 'word/document.xml':
            text = data.decode('utf-8')
            new_text = repair_xml(text)
            if new_text != text:
                modified = True
                data = new_text.encode('utf-8')
        new_entries.append((info, data))
    
    if modified:
        temp_fd, temp_path = tempfile.mkstemp(suffix='.docx', dir=path.parent)
        os.close(temp_fd)
        try:
            with zipfile.ZipFile(temp_path, 'w', compression=zipfile.ZIP_DEFLATED) as z_out:
                for info, data in new_entries:
                    z_out.writestr(info, data)
            os.replace(temp_path, path)
            print(f"Repaired: {path}")
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    else:
        print(f"Unchanged: {path}")

for p in sorted(Path('templates').rglob('*.docx')):
    repair_docx(p)
