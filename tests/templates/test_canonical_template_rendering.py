import importlib.util
import tempfile
import unittest
from pathlib import Path

from docx import Document


ROOT = Path(__file__).resolve().parents[2]
GENERATOR_PATH = ROOT / "scripts" / "generate-canonical-templates.py"
RENDERER_PATH = ROOT / "scripts" / "render-canonical-templates.py"
SPEC_PATH = ROOT / "templates" / "specs" / "administrative-templates.v1.json"


def load_module(name: str, path: Path):
    module_spec = importlib.util.spec_from_file_location(name, path)
    if module_spec is None or module_spec.loader is None:
        raise AssertionError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(module)
    return module


class CanonicalTemplateRenderingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.generator = load_module("canonical_generator_for_render_tests", GENERATOR_PATH)
        cls.renderer = load_module("canonical_renderer_for_tests", RENDERER_PATH) if RENDERER_PATH.exists() else None
        cls.spec = cls.generator.load_spec(SPEC_PATH)
        cls.templates = {template["key"]: template for template in cls.spec["templates"]}
        cls.temporary = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temporary.name)
        cls.input_dir = cls.root / "generated"
        cls.output_dir = cls.root / "rendered"
        cls.generator.generate_canonical_templates(SPEC_PATH, cls.input_dir)

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def require_renderer(self):
        self.assertIsNotNone(self.renderer, "render-canonical-templates.py must be implemented after this red test")
        return self.renderer

    def test_renders_all_templates_and_records_pdf_geometry_and_images(self):
        report = self.require_renderer().render_all(self.spec, self.input_dir, self.output_dir)
        self.assertEqual(report["status"], "passed")
        self.assertIn("LibreOffice", report["renderer"]["name"])
        self.assertEqual(len(report["templates"]), 23)
        for result in report["templates"]:
            self.assertEqual(result["visualQa"]["status"], "passed", result)
            self.assertTrue(result["pdfPath"])
            self.assertTrue(result["pages"])
            self.assertTrue(result["pageImages"])
            for page in result["pages"]:
                self.assertAlmostEqual(page["widthMm"], 210, delta=0.5)
                self.assertAlmostEqual(page["heightMm"], 297, delta=0.5)
                self.assertEqual(page["geometryFindings"], [], result)
            for image in result["pageImages"]:
                self.assertTrue((self.output_dir / image["path"]).is_file())
                self.assertRegex(image["sha256"], r"^[a-f0-9]{64}$")

    def test_first_page_suppresses_number_and_later_pages_show_word_page_field(self):
        renderer = self.require_renderer()
        source = self.input_dir / self.templates["iemm-quyet-dinh-ca-biet"]["canonicalFile"]
        long_document = Document(source)
        for index in range(120):
            long_document.add_paragraph(f"QA pagination paragraph {index + 1}: {{NOI_DUNG}}")
        fixture = self.root / "multipage-fixture.docx"
        long_document.save(fixture)
        result = renderer.render_documents([fixture], self.root / "pagination", renderer.find_libreoffice())
        page_report = renderer.analyze_pdf(result[0]["pdfPath"], self.root / "pagination", "pagination")
        self.assertGreaterEqual(len(page_report["pages"]), 2)
        self.assertFalse(page_report["pages"][0]["pageNumberAtTopCenter"] == "1")
        self.assertEqual(page_report["pages"][1]["pageNumberAtTopCenter"], "2")


if __name__ == "__main__":
    unittest.main()
