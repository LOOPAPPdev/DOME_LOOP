"""Validate public JSON examples against the repository's versioned schemas."""

from __future__ import annotations

import json
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate(schema_path: Path, instance_path: Path) -> None:
    schema = load_json(schema_path)
    instance = load_json(instance_path)
    errors = sorted(
        Draft202012Validator(schema).iter_errors(instance),
        key=lambda error: list(error.path),
    )
    if errors:
        details = "\n".join(f"- {'/'.join(map(str, error.path))}: {error.message}" for error in errors)
        raise SystemExit(f"{instance_path} failed validation:\n{details}")
    print(f"validated {instance_path} against {schema_path}")


if __name__ == "__main__":
    validate(ROOT / "schemas/system_case.schema.json", ROOT / "examples/system_case.json")
