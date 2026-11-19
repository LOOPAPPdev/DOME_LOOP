import tempfile
import unittest
from contextlib import closing
import importlib.util
from pathlib import Path

from loop_rag.core import connect, ingest_text, initialize

LANGGRAPH_AVAILABLE = importlib.util.find_spec("langgraph") is not None
if LANGGRAPH_AVAILABLE:
    from loop_rag.langgraph_workflow import run_langgraph


@unittest.skipUnless(LANGGRAPH_AVAILABLE, "install the agentic extra to run LangGraph tests")
class LangGraphWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.db = self.root / "knowledge.sqlite"
        self.source = self.root / "source.md"
        self.source.write_text(
            "Causal feedback and system dynamics validation require explicit evidence. "
            "Stocks, flows, delays, and governance affect model behavior.\n" * 8,
            encoding="utf-8",
        )
        with closing(connect(self.db)) as connection:
            initialize(connection)
            ingest_text(
                connection,
                "PUBLIC-NOTE",
                self.source,
                title="Public systems note",
                url="https://example.test/systems",
                access_group="public",
            )

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_evidence_path_preserves_provenance_and_hypothesis_gate(self):
        report = run_langgraph(
            self.db,
            "How should we validate causal feedback in system dynamics?",
            output=self.root / "evidence-run",
            group="public",
        )
        self.assertEqual(report["status"], "evidence_found")
        self.assertFalse(report["generated_answer"])
        self.assertEqual(report["simulation"], "not_performed")
        self.assertTrue(report["evidence"])
        self.assertTrue(all(link["status"] == "hypothesis" for link in report["causal_model"]["links"]))
        self.assertTrue(all(link["evidence_ids"] for link in report["causal_model"]["links"]))
        self.assertTrue(list((self.root / "evidence-run").glob("*_handoff.json")))

    def test_intervention_path_requires_human_approval(self):
        report = run_langgraph(
            self.db,
            "What intervention policy should we test for causal feedback?",
            group="public",
        )
        self.assertEqual(report["task"]["intent"], "intervention")
        self.assertTrue(report["interventions"])
        self.assertTrue(report["interventions"][0]["approval_required"])
        self.assertTrue(report["review"]["human_approval_required"])

    def test_empty_retrieval_abstains(self):
        report = run_langgraph(self.db, "zxqxzzqlm28888", group="public")
        self.assertEqual(report["status"], "insufficient_evidence")
        self.assertEqual(report["causal_model"]["links"], [])
        self.assertEqual(report["interventions"], [])


if __name__ == "__main__":
    unittest.main()
