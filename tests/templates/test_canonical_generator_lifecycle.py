import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
GENERATOR_PATH = ROOT / "scripts" / "generate-canonical-templates.py"
SPEC_PATH = ROOT / "templates" / "specs" / "administrative-templates.v1.json"


def load_generator():
    spec = importlib.util.spec_from_file_location("canonical_generator_lifecycle", GENERATOR_PATH)
    if spec is None or spec.loader is None:
        raise AssertionError(f"Cannot load {GENERATOR_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CanonicalGeneratorLifecycleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.generator = load_generator()
        cls.spec = cls.generator.load_spec(SPEC_PATH)

    def make_pass_reports(self, root: Path, output: Path):
        manifest = self.generator.generate_canonical_templates(SPEC_PATH, output)
        structural = {"ruleSpecVersion": "1.0.0", "status": "passed", "templates": []}
        visual = {"ruleSpecVersion": "1.0.0", "status": "passed", "renderer": {"name": "LibreOffice", "version": "26.2"}, "templates": []}
        for record in manifest["templates"]:
            structural["templates"].append({
                "templateKey": record["key"],
                "canonicalSha256": record["canonicalSha256"],
                "structuralQa": {"status": "passed"},
                "semanticQa": {"status": "passed"},
                "status": "passed",
            })
            visual["templates"].append({
                "templateKey": record["key"],
                "canonicalSha256": record["canonicalSha256"],
                "visualQa": {"status": "passed"},
                "status": "passed",
            })
        deterministic = self.generator.verify_determinism(SPEC_PATH, output)
        structural_path = root / "structural.json"
        deterministic_path = root / "deterministic.json"
        visual_path = root / "visual.json"
        structural_path.write_text(json.dumps(structural), encoding="utf-8")
        deterministic_path.write_text(json.dumps(deterministic), encoding="utf-8")
        visual_path.write_text(json.dumps(visual), encoding="utf-8")
        return structural_path, deterministic_path, visual_path

    def test_refuses_to_record_qa_if_any_generated_doc_fails_visual_inspection(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output = root / "generated"
            structural, deterministic, visual = self.make_pass_reports(root, output)
            report = json.loads(visual.read_text(encoding="utf-8"))
            report["templates"][0]["visualQa"]["status"] = "failed"
            visual.write_text(json.dumps(report), encoding="utf-8")

            with self.assertRaisesRegex(ValueError, "(?i)visual"):
                self.generator.record_qa_evidence(output, SPEC_PATH, structural, deterministic, visual)

    def test_records_hashed_structural_semantic_deterministic_and_visual_evidence(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output = root / "generated"
            structural, deterministic, visual = self.make_pass_reports(root, output)

            manifest = self.generator.record_qa_evidence(output, SPEC_PATH, structural, deterministic, visual)

            self.assertEqual(len(manifest["templates"]), 23)
            for record in manifest["templates"]:
                for qa_key in ("structuralQa", "semanticQa", "deterministicQa", "visualQa"):
                    self.assertEqual(record[qa_key]["status"], "passed")
                    self.assertRegex(record[qa_key]["sha256"], r"^[a-f0-9]{64}$")

    def test_runtime_sync_requires_all_qa_and_records_byte_exact_parity(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output = root / "generated"
            runtime = root / "templates"
            self.generator.generate_canonical_templates(SPEC_PATH, output)

            with self.assertRaisesRegex(ValueError, "QA"):
                self.generator.sync_runtime_templates(output, SPEC_PATH, runtime)

            structural, deterministic, visual = self.make_pass_reports(root, output)
            self.generator.record_qa_evidence(output, SPEC_PATH, structural, deterministic, visual)
            manifest = self.generator.sync_runtime_templates(output, SPEC_PATH, runtime)

            self.assertEqual(len(list(runtime.rglob("*.docx"))), 23)
            for record in manifest["templates"]:
                canonical = output / record["canonicalFile"]
                runtime_file = runtime / record["runtimePath"].replace("/templates/", "", 1)
                self.assertEqual(runtime_file.read_bytes(), canonical.read_bytes())
                self.assertEqual(record["runtimeParity"]["status"], "passed")
                self.assertEqual(record["runtimeParity"]["comparison"], "byte-exact")
                self.assertEqual(record["runtimeSha256"], record["canonicalSha256"])

    def test_runtime_sync_rejects_paths_outside_runtime_template_root(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output = root / "generated"
            runtime = root / "templates"
            structural, deterministic, visual = self.make_pass_reports(root, output)
            self.generator.record_qa_evidence(output, SPEC_PATH, structural, deterministic, visual)
            unsafe_spec = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
            unsafe_spec["templates"][0]["runtimePath"] = "/templates/../../outside.docx"
            unsafe_spec_path = root / "unsafe-spec.json"
            unsafe_spec_path.write_text(json.dumps(unsafe_spec), encoding="utf-8")

            with self.assertRaisesRegex(ValueError, "runtime path"):
                self.generator.sync_runtime_templates(output, unsafe_spec_path, runtime)


if __name__ == "__main__":
    unittest.main()
