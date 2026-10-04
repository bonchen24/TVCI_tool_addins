import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

from docx import Document


ROOT = Path(__file__).resolve().parents[2]
GENERATOR = ROOT / "scripts" / "generate-canonical-templates.py"
SPEC = ROOT / "templates" / "specs" / "administrative-templates.v1.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class CanonicalDocxGeneratorTests(unittest.TestCase):
    def test_generates_all_documents_deterministically_without_syncing_runtime(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "generated"
            command = [sys.executable, str(GENERATOR), "generate", "--spec", str(SPEC), "--output-dir", str(output)]
            first = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=False)
            self.assertEqual(first.returncode, 0, first.stdout + first.stderr)

            first_files = sorted(output.rglob("*.docx"))
            self.assertEqual(len(first_files), 23)
            first_hashes = {path.relative_to(output).as_posix(): sha256(path) for path in first_files}
            manifest_path = output / "provenance.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            self.assertEqual(manifest["ruleSpecVersion"], "1.0.0")
            self.assertEqual(manifest["generatorVersion"], "1.0.0")
            self.assertEqual(len(manifest["templates"]), 23)
            self.assertRegex(manifest["generatorSha256"], r"^[a-f0-9]{64}$")
            self.assertFalse((Path(temporary) / "templates").exists())

            for path in first_files:
                Document(str(path))
                with zipfile.ZipFile(path) as package:
                    infos = package.infolist()
                    self.assertEqual([info.filename for info in infos], sorted(info.filename for info in infos))
                    self.assertTrue(all(info.date_time == (1980, 1, 1, 0, 0, 0) for info in infos))

            second = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=False)
            self.assertEqual(second.returncode, 0, second.stdout + second.stderr)
            second_hashes = {path.relative_to(output).as_posix(): sha256(path) for path in sorted(output.rglob("*.docx"))}
            self.assertEqual(first_hashes, second_hashes)

            entries = {item["key"]: item for item in manifest["templates"]}
            self.assertNotEqual(entries["iemm-bao-cao"]["canonicalFile"], entries["iemm-ke-hoach"]["canonicalFile"])
            self.assertNotEqual(entries["iemm-bao-cao"]["canonicalFile"], entries["iemm-van-ban-co-ten-loai"]["canonicalFile"])


if __name__ == "__main__":
    unittest.main()
