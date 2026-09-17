"""Normalize only DOCX assets referenced by the bundled catalog (idempotent)."""
from __future__ import annotations
import re
import tempfile
import zipfile
from pathlib import Path
from lxml import etree as ET

ROOT = Path(__file__).resolve().parents[1]
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
V = 'urn:schemas-microsoft-com:vml'
W10 = 'urn:schemas-microsoft-com:office:word'
NS = {'w': W, 'v': V, 'w10': W10}
q = lambda name: '{%s}%s' % (W, name)

PATHS = [*sorted((ROOT / 'templates/iemm').glob('*.docx')),
    ROOT / 'templates/iemm-don-xin-nghi-phep-template.docx',
    ROOT / 'templates/iemm-sample.docx',
    ROOT / 'templates/tvci-cong-van-template.docx',
    ROOT / 'templates/tvci-thong-bao-template.docx',
    ROOT / 'templates/tvci-sample.docx',
    ROOT / 'templates/dang-sample.docx']


def text(p):
    return ''.join(p.xpath('.//w:t/text()', namespaces=NS)).strip()


def ppr(p):
    found = p.find(q('pPr'))
    if found is None:
        found = ET.Element(q('pPr'))
        p.insert(0, found)
    return found


def align(p, value):
    pr = ppr(p)
    jc = pr.find(q('jc'))
    if jc is None:
        jc = ET.SubElement(pr, q('jc'))
    jc.set(q('val'), value)


def set_text(p, value):
    nodes = p.xpath('.//w:t', namespaces=NS)
    if nodes:
        nodes[0].text = value
        nodes[0].set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        for n in nodes[1:]: n.text = ''


def line_control(tag, width_pt, line_id):
    xml = f'''<w:sdt xmlns:w="{W}" xmlns:v="{V}" xmlns:w10="{W10}">
      <w:sdtPr><w:tag w:val="{tag}"/></w:sdtPr>
      <w:sdtContent><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:jc w:val="center"/></w:pPr>
      <w:r><w:pict><v:line id="{line_id}" style="position:absolute;left:0;top:-2pt;width:{width_pt}pt;height:0pt;z-index:1;mso-position-horizontal:center;mso-position-horizontal-relative:column;mso-position-vertical-relative:text" from="0,0" to="{width_pt}pt,0" strokecolor="#000000" strokeweight="0.5pt"><w10:wrap type="none"/></v:line></w:pict></w:r></w:p></w:sdtContent></w:sdt>'''
    return ET.fromstring(xml.encode('utf-8'))


def remove_borders(root):
    for el in root.xpath('.//w:pBdr|.//w:tblBorders|.//w:u', namespaces=NS):
        el.getparent().remove(el)


def normalize(path):
    with zipfile.ZipFile(path) as z:
        entries = [(i, z.read(i.filename)) for i in z.infolist()]
    root = ET.fromstring(next(data for info, data in entries if info.filename == 'word/document.xml'))
    remove_borders(root)
    if path.name != 'dang-sample.docx':
        body = root.find(q('body'))
        table = next((el for el in body if el.tag == q('tbl')), None)
        if table is not None:
            row = table.find(q('tr'))
            cells = row.findall(q('tc')) if row is not None else []
            if len(cells) >= 2:
                left, right = cells[:2]
                # Earlier source conversions sometimes left the date in an invalid third cell.
                for extra in cells[2:]:
                    for p in list(extra):
                        if p.tag == q('p') and text(p):
                            extra.remove(p)
                            right.append(p)
                    row.remove(extra)
                # The abstract belongs with the number in the issuing-agency column.
                for p in list(right):
                    if p.tag == q('p') and text(p).startswith('V/v'):
                        right.remove(p)
                        left.append(p)
                for cell in (left, right):
                    for p in cell.xpath('.//w:p', namespaces=NS):
                        value = text(p)
                        if not value: continue
                        if value.startswith('Hà Nội') or value.startswith('[Địa danh]'):
                            set_text(p, re.sub(r'^\[Địa danh\]', 'Hà Nội', value))
                            align(p, 'right')
                            for rpr in p.xpath('.//w:rPr', namespaces=NS):
                                if rpr.find(q('i')) is None: ET.SubElement(rpr, q('i'))
                        elif value.startswith('V/v'):
                            set_text(p, re.sub(r'^V/v\s*:?[ \t]*', 'V/v ', value, flags=re.I).replace('V/v v/v ', 'V/v '))
                            align(p, 'center')
                        else:
                            align(p, 'center')
                # One line spans the full lower-tier name, even if that name wraps.
                for cell, label, tag, width, lid in [
                    (left, 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN' if 'iemm' in path.parts or path.name.startswith('iemm-') else 'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP', 'TVCI_HRULE:AGENCY', 220, 'agency-rule'),
                    (right, 'Độc lập - Tự do - Hạnh phúc', 'TVCI_HRULE:NATIONAL_MOTTO', 160, 'motto-rule')]:
                    for old in list(cell):
                        if old.xpath('.//w:tag[@w:val="%s"]' % tag, namespaces=NS): cell.remove(old)
                    target = next((p for p in cell if p.tag == q('p') and text(p) == label), None)
                    if target is not None:
                        cell.insert(cell.index(target) + 1, line_control(tag, width, lid))
    for p in root.xpath('.//w:p', namespaces=NS):
        value = text(p)
        if value.startswith('V/v'):
            cleaned = re.sub(r'^(?:V/v\s*:?[ \t]*)+', '', value, flags=re.I).strip()
            if cleaned:
                cleaned = cleaned[0].upper() + cleaned[1:]
                set_text(p, 'V/v ' + cleaned)
        if '(Ký và ghi rõ họ tên)' in value:
            set_text(p, value.replace('(Ký và ghi rõ họ tên)', '').strip())
    document = ET.tostring(root, encoding='UTF-8', xml_declaration=True, standalone=True)
    with tempfile.NamedTemporaryFile(prefix='final-template-', suffix='.docx', dir=path.parent, delete=False) as f:
        temporary = Path(f.name)
    try:
        with zipfile.ZipFile(temporary, 'w') as output:
            for info, data in entries:
                output.writestr(info, document if info.filename == 'word/document.xml' else data)
        with zipfile.ZipFile(temporary) as check:
            assert check.testzip() is None
            ET.fromstring(check.read('word/document.xml'))
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


if __name__ == '__main__':
    for path in PATHS:
        normalize(path)
    print(f'Normalized {len(PATHS)} catalog DOCX files.')
