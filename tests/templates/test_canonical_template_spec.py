import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SPEC_PATH = ROOT / "templates" / "specs" / "administrative-templates.v1.json"


class CanonicalTemplateSpecTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spec = json.loads(SPEC_PATH.read_text(encoding="utf-8")) if SPEC_PATH.exists() else {}

    def test_spec_has_versioned_common_page_and_typography_tokens(self):
        style = self.spec.get("commonStyle", {})
        self.assertEqual(self.spec.get("ruleSpecVersion"), "1.0.0")
        self.assertEqual(style.get("page"), {
            "paper": "A4",
            "orientation": "portrait",
            "widthMm": 210,
            "heightMm": 297,
            "marginsMm": {"top": 20, "bottom": 20, "left": 30, "right": 15},
        })
        self.assertEqual(style.get("font"), {"name": "Times New Roman", "unicode": True, "color": "000000", "bodyPt": 13})
        self.assertEqual(style.get("pageNumber"), {"fontPt": 13, "position": "top-center", "suppressFirstPage": True})
        self.assertEqual(style.get("recipientLine", {}).get("fontPt"), 13)
        self.assertEqual(style.get("recipientLine", {}).get("firstLineIndentMm"), 0)
        self.assertEqual(style.get("headerFooter"), {"headerDistanceMm": 8, "footerDistanceMm": 10})
        self.assertEqual(style.get("horizontalRule"), {"style": "single", "color": "000000", "sizeEighthPt": 4, "spacePt": 2})
        self.assertEqual(style.get("tableCellMarginsMm"), {"top": 0, "start": 0, "bottom": 0, "end": 0})

    def test_spec_records_supplied_normative_and_reference_source_metadata(self):
        sources = {source["key"]: source for source in self.spec.get("sources", [])}
        self.assertEqual(sources.get("iemm-q731", {}).get("driveFileId"), "1QixLiN0n_2coMWTakVKF2VjDA1hK5Xok")
        self.assertEqual(sources.get("tkv-1456", {}).get("driveFileId"), "1mD8LuhIR3r6_mVGgUWxu2ujCAqAsgcMH")
        self.assertEqual(sources.get("tkv-586-2021", {}).get("driveFileId"), "1imdd_8aeS-WYJXYkRhiZlwtbqOjxiGUi")
        self.assertEqual(sources.get("tkv-history-2018", {}).get("driveFileId"), "1lKEgbA1VScYtmDznZ3QmhSFeJdn4hyl4")
        self.assertEqual(sources.get("iemm-plvii", {}).get("reference"), "QĐ 731-2023, Phụ lục VII")

    def test_spec_defines_each_document_type_as_a_separate_canonical_file(self):
        templates = self.spec.get("templates", [])
        self.assertEqual(len(templates), 23)
        outputs = [template["canonicalFile"] for template in templates]
        self.assertEqual(len(outputs), len(set(outputs)))
        by_key = {template["key"]: template for template in templates}
        for key in (
            "iemm-quyet-dinh-ca-biet", "iemm-quyet-dinh-ban-hanh", "iemm-quy-che",
            "iemm-van-ban-kem-quyet-dinh", "iemm-cong-van", "iemm-thong-bao",
            "iemm-to-trinh-vien", "iemm-to-trinh-don-vi", "iemm-bien-ban",
            "iemm-van-ban-co-ten-loai", "iemm-ban-sao", "iemm-thu-moi",
            "iemm-thu-hoan-hop", "iemm-cong-van-dinh-chinh", "iemm-bao-cao",
            "iemm-ke-hoach", "iemm-don-xin-nghi-phep", "iemm-chuong-trinh",
            "iemm-giay-gioi-thieu", "iemm-ban-cam-ket", "tvci-cong-van",
            "tvci-thong-bao", "tkv-quyet-dinh",
        ):
            self.assertIn(key, by_key)
        self.assertNotEqual(by_key["iemm-bao-cao"]["canonicalFile"], by_key["iemm-ke-hoach"]["canonicalFile"])
        self.assertNotEqual(by_key["iemm-bao-cao"]["canonicalFile"], by_key["iemm-van-ban-co-ten-loai"]["canonicalFile"])

    def test_document_semantics_are_encoded_per_type(self):
        templates = {template["key"]: template for template in self.spec.get("templates", [])}
        schemas = self.spec.get("documentTypes", {})
        letter = schemas.get(templates.get("iemm-cong-van", {}).get("typeSchema"), {})
        decision = schemas.get(templates.get("iemm-quyet-dinh-ca-biet", {}).get("typeSchema"), {})
        proposal = schemas.get(templates.get("iemm-to-trinh-vien", {}).get("typeSchema"), {})
        copy = schemas.get(templates.get("iemm-ban-sao", {}).get("typeSchema"), {})
        self.assertIn("V/v", letter.get("requiredLabels", []))
        self.assertIn("CÔNG VĂN", letter.get("forbiddenLabels", []))
        self.assertIn("QUYẾT ĐỊNH:", decision.get("requiredLabels", []))
        self.assertTrue(all(f"Điều {number}." in decision.get("requiredLabels", []) for number in (1, 2, 3)))
        self.assertIn("Kính gửi:", proposal.get("requiredLabels", []))
        self.assertIn("BẢN SAO", copy.get("requiredLabels", []))
        self.assertEqual(templates.get("iemm-don-xin-nghi-phep", {}).get("sourceClassification"), "internally-defined")

    def test_placeholder_tokens_are_declared_once(self):
        placeholders = set(self.spec.get("placeholders", []))
        self.assertTrue({
            "{SO_VAN_BAN}", "{KY_HIEU}", "{DIA_DANH}", "{NGAY_THANG}",
            "{TRICH_YEU}", "{NOI_DUNG}", "{CHUC_VU_NGUOI_KY}",
            "{HO_TEN_NGUOI_KY}", "{NOI_NHAN}",
        }.issubset(placeholders))

    def test_symbol_patterns_and_internal_form_modes_are_explicit(self):
        templates = {template["key"]: template for template in self.spec.get("templates", [])}
        self.assertIn("/VCNM-TTTN", templates.get("tvci-cong-van", {}).get("symbolPattern", ""))
        self.assertIn("/TB-VCNM", templates.get("tvci-thong-bao", {}).get("symbolPattern", ""))
        self.assertIn("/BC-VCNM", templates.get("iemm-bao-cao", {}).get("symbolPattern", ""))
        self.assertIn("/KH-VCNM", templates.get("iemm-ke-hoach", {}).get("symbolPattern", ""))
        self.assertTrue(all("symbolPattern" in template for template in templates.values()))
        leave_schema = self.spec["documentTypes"][templates["iemm-don-xin-nghi-phep"]["typeSchema"]]
        self.assertEqual(leave_schema.get("headerMode"), "internal")
        self.assertIn("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", leave_schema["forbiddenLabels"])


if __name__ == "__main__":
    unittest.main()
