import glob
import os
import re
import shutil
import sys
import tempfile
import zipfile

ROOT_TAG = (
    '<w:document '
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
    'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
    'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" '
    'xmlns:v="urn:schemas-microsoft-com:vml" '
    'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" '
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
    'xmlns:w10="urn:schemas-microsoft-com:office:word" '
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" '
    'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" '
    'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" '
    'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
    'mc:Ignorable="w14 w15 wp14">'
)

def make_drawing_xml(cx, offset_x, offset_y, rule_id, rule_name):
    pt_len = round(cx / 12700, 2)
    return (
        f'<w:r>'
        f'<w:rPr><w:noProof/></w:rPr>'
        f'<mc:AlternateContent>'
        f'<mc:Choice Requires="wps">'
        f'<w:drawing>'
        f'<wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">'
        f'<wp:simplePos x="0" y="0"/>'
        f'<wp:positionH relativeFrom="column"><wp:posOffset>{offset_x}</wp:posOffset></wp:positionH>'
        f'<wp:positionV relativeFrom="paragraph"><wp:posOffset>{offset_y}</wp:posOffset></wp:positionV>'
        f'<wp:extent cx="{cx}" cy="0"/>'
        f'<wp:effectExtent l="0" t="0" r="0" b="0"/>'
        f'<wp:wrapNone/>'
        f'<wp:docPr id="{rule_id}" name="{rule_name}"/>'
        f'<wp:cNvGraphicFramePr/>'
        f'<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
        f'<a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">'
        f'<wps:wsp>'
        f'<wps:cNvCnPr/>'
        f'<wps:spPr>'
        f'<a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="0"/></a:xfrm>'
        f'<a:prstGeom prst="line"><a:avLst/></a:prstGeom>'
        f'<a:ln w="9525"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln>'
        f'</wps:spPr>'
        f'<wps:bodyPr/>'
        f'</wps:wsp>'
        f'</a:graphicData>'
        f'</a:graphic>'
        f'</wp:anchor>'
        f'</w:drawing>'
        f'</mc:Choice>'
        f'<mc:Fallback>'
        f'<w:pict><v:line id="{rule_name}" style="position:absolute;z-index:251658240;visibility:visible" from="0,0" to="{pt_len}pt,0" strokecolor="#000000" strokeweight="0.75pt"><w10:wrap type="none"/></v:line></w:pict>'
        f'</mc:Fallback>'
        f'</mc:AlternateContent>'
        f'</w:r>'
    )

# Section III.1-3: Đường kẻ dưới tên công ty bao phủ toàn bộ cụm tên 2 dòng (~6.1cm = 2.180.000 emu)
AGENCY_RULE_XML = make_drawing_xml(2180000, 240000, 220000, 102, "Agency rule")
# Section III.4: Đường kẻ dưới tiêu ngữ có chiều dài bằng dòng: Độc lập - Tự do - Hạnh phúc (~7.0cm = 2.500.000 emu)
MOTTO_RULE_XML = make_drawing_xml(2500000, 380000, 240000, 101, "Motto rule")

TVCI_SAMPLE_HEADER_TABLE = f"""<w:tbl>
  <w:tblPr>
    <w:tblW w:w="9354" w:type="dxa"/>
    <w:jc w:val="center"/>
    <w:tblLayout w:type="fixed"/>
    <w:tblCellMar>
      <w:left w:w="0" w:type="dxa"/>
      <w:right w:w="0" w:type="dxa"/>
    </w:tblCellMar>
    <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="4200"/>
    <w:gridCol w:w="5154"/>
  </w:tblGrid>
  <w:tr>
    <w:trPr><w:jc w:val="center"/></w:trPr>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="4200" w:type="dxa"/>
        <w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders>
        <w:vAlign w:val="top"/>
      </w:tcPr>
      <w:p>
        <w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>TẬP ĐOÀN CÔNG NGHIỆP</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>THAN - KHOÁNG SẢN VIỆT NAM</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>VINACOMIN</w:t></w:r>
        {AGENCY_RULE_XML}
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:before="120" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">Số:         /VCKM-TB</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="5154" w:type="dxa"/>
        <w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders>
        <w:noWrap/>
        <w:vAlign w:val="top"/>
      </w:tcPr>
      <w:p>
        <w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>Độc lập - Tự do - Hạnh phúc</w:t></w:r>
        {MOTTO_RULE_XML}
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:before="120" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="right"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:i/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>Hà Nội, ngày 09 tháng 9 năm 2026</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>
</w:tbl>"""

def clean_and_standardize_template(docx_path: str) -> bool:
    with zipfile.ZipFile(docx_path, "r") as z_in:
        entries = [(info, z_in.read(info.filename)) for info in z_in.infolist() if "customXml" not in info.filename]

    changed = True
    new_entries = []

    for info, data in entries:
        filename = info.filename

        if filename == "word/_rels/document.xml.rels":
            xml = data.decode("utf-8")
            xml = re.sub(r'<Relationship[^>]*customXml[^>]*/>', '', xml)
            data = xml.encode("utf-8")
        elif filename == "[Content_Types].xml":
            xml = data.decode("utf-8")
            xml = re.sub(r'<Override[^>]*customXml[^>]*/>', '', xml)
            data = xml.encode("utf-8")

        # 1. Clean auxiliary XML files (footer, endnotes, etc.)
        elif filename.endswith(".xml") and filename != "word/document.xml":
            xml = data.decode("utf-8")
            if "ns1:Ignorable" in xml:
                xml = re.sub(r'\s*xmlns:ns1="[^"]*"', '', xml)
                xml = re.sub(r'\s*ns1:Ignorable="[^"]*"', '', xml)
            xml = re.sub(r'\s*mc:Ignorable="[^"]*"', '', xml)
            data = xml.encode("utf-8")

        # 2. Process word/document.xml
        elif filename == "word/document.xml":
            xml_str = data.decode("utf-8")

            # A. Replace root tag with comprehensive namespaces
            xml_str = re.sub(r'<w:document\b[^>]*>', ROOT_TAG, xml_str, count=1)

            # B. Strip any legacy TVCI_HRULE SDTs safely
            xml_str = re.sub(r'<w:sdt(?:\s+[^>]*)?>\s*<w:sdtPr>(?:(?!</w:sdtPr>).)*?TVCI_HRULE.*?</w:sdt>', '', xml_str, flags=re.DOTALL)

            # C. Strip any prior drawing lines in headers before re-adding
            xml_str = re.sub(r'<w:r(?:\s+[^>]*)?>\s*(?:<w:rPr>.*?</w:rPr>\s*)?<mc:AlternateContent>.*?Agency rule.*?</mc:AlternateContent>\s*</w:r>', '', xml_str, flags=re.DOTALL)
            xml_str = re.sub(r'<w:r(?:\s+[^>]*)?>\s*(?:<w:rPr>.*?</w:rPr>\s*)?<mc:AlternateContent>.*?Motto rule.*?</mc:AlternateContent>\s*</w:r>', '', xml_str, flags=re.DOTALL)
            xml_str = re.sub(r'<w:r(?:\s+[^>]*)?>\s*(?:<w:rPr>.*?</w:rPr>\s*)?<w:drawing>.*?Agency rule.*?</w:drawing>\s*</w:r>', '', xml_str, flags=re.DOTALL)
            xml_str = re.sub(r'<w:r(?:\s+[^>]*)?>\s*(?:<w:rPr>.*?</w:rPr>\s*)?<w:drawing>.*?Motto rule.*?</w:drawing>\s*</w:r>', '', xml_str, flags=re.DOTALL)

            # D. Section XI.8: Remove any paragraph containing "(Ký và ghi rõ họ tên)"
            xml_str = re.sub(
                r"<w:p(?:\s+[^>]*)?>\s*(?:<w:pPr>.*?</w:pPr>\s*)?(?:<w:r(?:\s+[^>]*)?>\s*(?:<w:rPr>.*?</w:rPr>\s*)?<w:t[^>]*>\s*\([Kk]ý(?:\s*và|\s*,)?\s*ghi\s+rõ\s+họ\s+tên\s*\)\s*</w:t>\s*</w:r>\s*)+</w:p>",
                "",
                xml_str,
                flags=re.DOTALL
            )

            # E. Section I: Page Margins (A4: top 20, bottom 20, left 30, right 15 mm)
            def update_sectpr(match):
                sect = match.group(0)
                if '<w:pgSz' in sect:
                    sect = re.sub(r'<w:pgSz\s+[^>]*/>', '<w:pgSz w:w="11906" w:h="16838"/>', sect)
                else:
                    sect = sect.replace('<w:sectPr>', '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>')
                if '<w:pgMar' in sect:
                    sect = re.sub(r'<w:pgMar\s+[^>]*/>', '<w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="720" w:footer="720" w:gutter="0"/>', sect)
                else:
                    sect = sect.replace('</w:sectPr>', '<w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>')
                return sect
            xml_str = re.sub(r"<w:sectPr(?:\s+[^>]*)?>.*?</w:sectPr>", update_sectpr, xml_str, flags=re.DOTALL)

            # F. If file is tvci-sample.docx, replace header table with clean TVCI table
            if os.path.basename(docx_path) == "tvci-sample.docx":
                xml_str = re.sub(r'<w:tbl>.*?</w:tbl>', TVCI_SAMPLE_HEADER_TABLE, xml_str, count=1, flags=re.DOTALL)
            else:
                # Insert rules into header
                if "Motto rule" not in xml_str and "Độc lập - Tự do - Hạnh phúc" in xml_str:
                    xml_str = re.sub(r'(<w:t[^>]*>Độc lập - Tự do - Hạnh phúc</w:t></w:r>)', r'\1' + MOTTO_RULE_XML, xml_str, count=1)
                if "Agency rule" not in xml_str and "VINACOMIN" in xml_str:
                    xml_str = re.sub(r'(<w:t[^>]*>VINACOMIN</w:t></w:r>)', r'\1' + AGENCY_RULE_XML, xml_str, count=1)

            # G. Normalize pseudo-namespaces and relationship IDs across the document
            xml_str = xml_str.replace('ns2:id=', 'r:id=')
            xml_str = xml_str.replace('ns3:id=', 'r:id=')
            xml_str = xml_str.replace('ns2:paraId=', 'w14:paraId=')
            xml_str = xml_str.replace('ns2:textId=', 'w14:textId=')
            xml_str = xml_str.replace('ns1:Ignorable=', 'mc:Ignorable=')

            # H. Standardize all rPr to Times New Roman across the document
            def fix_rpr(match):
                rpr = match.group(0)
                if "w:noProof" in rpr:
                    return rpr
                if "w:rFonts" not in rpr:
                    return rpr.replace("<w:rPr>", '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>')
                def update_rfonts(rf_match):
                    rf = rf_match.group(0)
                    for attr in ['w:ascii', 'w:hAnsi', 'w:cs']:
                        if f'{attr}=' not in rf:
                            rf = rf.replace('<w:rFonts', f'<w:rFonts {attr}="Times New Roman"')
                        else:
                            rf = re.sub(rf'{attr}="[^"]*"', f'{attr}="Times New Roman"', rf)
                    return rf
                return re.sub(r'<w:rFonts\s+[^>]*/>', update_rfonts, rpr)
            xml_str = re.sub(r"<w:rPr>.*?</w:rPr>", fix_rpr, xml_str, flags=re.DOTALL)

            data = xml_str.encode("utf-8")

        elif filename == "word/styles.xml":
            styles_str = data.decode("utf-8")
            if 'w:styleId="Normal"' in styles_str:
                def fix_normal_style(match):
                    s = match.group(0)
                    if '<w:rFonts' in s:
                        s = re.sub(r'<w:rFonts\s+[^>]*/>', '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>', s)
                    else:
                        s = s.replace('<w:rPr>', '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>')
                    return s
                styles_str = re.sub(r'<w:style[^>]*w:styleId="Normal"[^>]*>.*?</w:style>', fix_normal_style, styles_str, flags=re.DOTALL)
                data = styles_str.encode("utf-8")

        new_entries.append((info, data))

    temp_fd, temp_path = tempfile.mkstemp(suffix=".docx")
    os.close(temp_fd)
    try:
        with zipfile.ZipFile(temp_path, "w", compression=zipfile.ZIP_DEFLATED) as z_out:
            for info, data in new_entries:
                z_out.writestr(info, data)
        shutil.copyfile(temp_path, docx_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return changed

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    templates_dir = os.path.join(root_dir, "templates")
    dist_templates_dir = os.path.join(root_dir, "dist", "templates")
    
    # Sync iemm-to-trinh-noi-bo-template from iemm/08-to-trinh-cua-don-vi-gui-vien to ensure valid base
    src_08 = os.path.join(templates_dir, "iemm", "08-to-trinh-cua-don-vi-gui-vien.docx")
    dst_to_trinh = os.path.join(templates_dir, "iemm-to-trinh-noi-bo-template.docx")
    if os.path.exists(src_08):
        shutil.copyfile(src_08, dst_to_trinh)

    files = [f for f in glob.glob(os.path.join(templates_dir, "**", "*.docx"), recursive=True) if not os.path.basename(f).startswith("~$")]
    print(f"Standardizing {len(files)} templates in templates/ ...")
    
    count = 0
    for f in sorted(files):
        if clean_and_standardize_template(f):
            print(f"[STANDARDIZED] {os.path.relpath(f, root_dir)}")
            count += 1
            
    print(f"\nSyncing to {dist_templates_dir} ...")
    if os.path.exists(dist_templates_dir):
        shutil.rmtree(dist_templates_dir)
    shutil.copytree(templates_dir, dist_templates_dir)
    print(f"Sync complete: {count}/{len(files)} templates standardized.")

if __name__ == "__main__":
    main()
