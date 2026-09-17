import glob
import os
import re
import shutil
import tempfile
import zipfile

def sanitize_docx(file_path: str) -> bool:
    """Removes corrupting TVCI_HRULE sdt anchor blocks from a docx file."""
    with zipfile.ZipFile(file_path, "r") as z_in:
        entries = [(info, z_in.read(info.filename)) for info in z_in.infolist()]

    changed = False
    new_entries = []
    for info, data in entries:
        if info.filename == "word/document.xml":
            xml_str = data.decode("utf-8")
            if "TVCI_HRULE" in xml_str:
                cleaned_xml = re.sub(
                    r"<w:sdt>(?:(?!</w:sdt>).)*?TVCI_HRULE.*?</w:sdt>",
                    "",
                    xml_str,
                    flags=re.DOTALL,
                )
                if cleaned_xml != xml_str:
                    data = cleaned_xml.encode("utf-8")
                    changed = True
        new_entries.append((info, data))

    if changed:
        temp_fd, temp_path = tempfile.mkstemp(suffix=".docx")
        os.close(temp_fd)
        try:
            with zipfile.ZipFile(temp_path, "w", compression=zipfile.ZIP_DEFLATED) as z_out:
                for info, data in new_entries:
                    z_out.writestr(info, data)
            shutil.copyfile(temp_path, file_path)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
    return changed

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    patterns = [
        os.path.join(root_dir, "templates", "**", "*.docx"),
        os.path.join(root_dir, "dist", "templates", "**", "*.docx"),
    ]
    
    total = 0
    sanitized = 0
    for pattern in patterns:
        for f in glob.glob(pattern, recursive=True):
            total += 1
            if sanitize_docx(f):
                print(f"[CLEANED] {os.path.relpath(f, root_dir)}")
                sanitized += 1
            else:
                print(f"[OK] {os.path.relpath(f, root_dir)}")
                
    print(f"\nDone: {sanitized} sanitized out of {total} checked.")

if __name__ == "__main__":
    main()
