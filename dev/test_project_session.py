import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("project_session", Path(__file__).with_name("project_session.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
A = "01a13d6e-388a-72b3-a7db-af91e4287244"
B = "01a13e18-fe66-7e20-8cdf-5ece2574d056"


class SessionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.home = Path(self.tmp.name)
        self.project = Path("/project")
        (self.home / "sessions").mkdir()

    def record(self, identity=A, cwd=None, timestamp="2026-10-15T01:00:00Z", source="cli"):
        path = self.home / "sessions" / (identity + ".jsonl")
        path.write_text(json.dumps({"type":"session_meta", "payload":{"id":identity,"cwd":cwd or str(self.project),"timestamp":timestamp,"source":source}}) + "\nPRIVATE INVALID JSON MUST NOT BE READ", encoding="utf-8")
        return path

    def test_preferred_exec_session_is_pinned_and_not_replaced_by_newer(self):
        self.record()
        self.assertEqual(module.select(self.home, self.project, A)["id"], A)
        self.record(B, timestamp="2026-10-15T02:00:00Z")
        self.assertEqual(module.select(self.home, self.project)["id"], A)

    def test_other_project_never_selected(self):
        self.record(cwd="/other")
        self.assertEqual(module.select(self.home, self.project)["mode"], "new")
        with self.assertRaises(ValueError):
            module.select(self.home, self.project, explicit=A)

    def test_deleted_pin_is_explicit_missing_not_another_session(self):
        path = self.record()
        module.select(self.home, self.project)
        path.unlink()
        self.record(B)
        self.assertEqual(module.select(self.home, self.project)["mode"], "missing")

    def test_new_session_adopted_only_after_entry_time(self):
        self.record()
        self.assertEqual(module.select(self.home, self.project, after="2026-10-15T01:30:00Z")["mode"], "new")
        self.record(B, timestamp="2026-10-15T02:00:00Z")
        self.assertEqual(module.select(self.home, self.project, after="2026-10-15T01:30:00Z")["id"], B)

    def test_background_exec_not_adopted_as_new_interactive_session(self):
        self.record(source="exec")
        self.assertEqual(module.select(self.home, self.project)["mode"], "new")
        self.assertEqual(module.select(self.home, self.project, after="2026-10-15T00:00:00Z")["mode"], "new")
        self.assertEqual(module.select(self.home, self.project, preferred=A)["id"], A)

    def test_ambiguous_interactive_sessions_require_explicit_choice(self):
        self.record()
        self.record(B)
        self.assertEqual(module.select(self.home, self.project)["mode"], "ambiguous")

    def test_corrupt_metadata_does_not_block_valid_session(self):
        self.record()
        for index, record in enumerate(([], {"payload": []}, {"payload": {"cwd": 12}}, {"payload": {"cwd": "/project", "id": []}})):
            (self.home / "sessions" / f"corrupt{index}.jsonl").write_text(json.dumps(record), encoding="utf-8")
        self.assertEqual(module.select(self.home, self.project)["id"], A)

    def test_structured_subagent_source_is_not_an_interactive_root(self):
        self.record(source={"subagent": {"thread_spawn": "synthetic"}})
        self.assertEqual(module.select(self.home, self.project)["mode"], "new")


if __name__ == "__main__":
    unittest.main()
