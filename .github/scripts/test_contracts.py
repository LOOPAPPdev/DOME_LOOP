"""Negative contract tests for conservative frontend SystemCase view DTO semantics."""

from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = json.loads((ROOT / "frontend/schemas/system-case-view.schema.json").read_text(encoding="utf-8"))
FIXTURE = json.loads((ROOT / "frontend/src/data/demo-system-case.json").read_text(encoding="utf-8"))
VALIDATOR = Draft202012Validator(SCHEMA)
Draft202012Validator.check_schema(SCHEMA)


class FrontendViewContractTests(unittest.TestCase):
    def assert_invalid(self, case: dict, expected_path: tuple[object, ...]) -> None:
        errors = list(VALIDATOR.iter_errors(case))
        self.assertTrue(errors, "fixture unexpectedly satisfied a deliberately invalid contract")
        self.assertTrue(
            any(tuple(error.absolute_path)[: len(expected_path)] == expected_path for error in errors),
            [f"{list(error.absolute_path)}: {error.message}" for error in errors],
        )

    def test_demo_fixture_is_valid(self) -> None:
        VALIDATOR.validate(FIXTURE)

    def test_revision_must_be_a_positive_decimal_token(self) -> None:
        case = copy.deepcopy(FIXTURE)
        case["revision"] = "01"
        self.assert_invalid(case, ("revision",))

    def test_external_validation_requires_reviewer_and_evidence(self) -> None:
        case = copy.deepcopy(FIXTURE)
        case["status"] = "externally_validated"
        self.assert_invalid(case, ("review", "externalReviewer"))

    def test_validated_simulation_requires_provenance_and_result(self) -> None:
        case = copy.deepcopy(FIXTURE)
        case["simulation"]["status"] = "validated"
        self.assert_invalid(case, ("simulation", "validationEvidenceIds"))

    def test_verified_evidence_requires_a_source_reference(self) -> None:
        case = copy.deepcopy(FIXTURE)
        case["evidence"][0]["status"] = "verified"
        self.assert_invalid(case, ("evidence", 0, "sourceId"))

    def test_supported_relation_requires_an_evidence_reference(self) -> None:
        case = copy.deepcopy(FIXTURE)
        case["relations"][0]["status"] = "supported"
        case["relations"][0]["evidenceIds"] = []
        self.assert_invalid(case, ("relations", 0, "evidenceIds"))

    def test_internal_snake_case_fields_are_rejected_at_view_boundary(self) -> None:
        case = copy.deepcopy(FIXTURE)
        case["case_id"] = case.pop("id")
        errors = list(VALIDATOR.iter_errors(case))
        self.assertTrue(any(error.validator == "additionalProperties" and "case_id" in error.message for error in errors))


if __name__ == "__main__":
    unittest.main(verbosity=2)
