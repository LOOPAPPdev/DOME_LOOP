# Agent Handoff — project configuration

## Verification Commands

test: `python -m unittest discover -s tests -v`
typecheck: (not configured — Python annotations, dynamic validation)
lint: `python -m compileall -q src tests scripts`
build: `python -m loop_rag build --db output/loop_knowledge.sqlite --pdf /path/to/input.pdf --page-offset 25 --notes-dir sources`

## Conventions
response_language: pt-PT
handoff_dir: .handoff
commit_style: conventional
convention_docs: AGENTS.md

## Documentation Index
- `AGENTS.md` team constraints and roles
- `skills/loop-agentic-rag/SKILL.md` execution instructions
- `docs/WORKING_PROCESS.md` gates, contracts and limitations
- `docs/ARCHITECTURE.mmd` process diagram
- `docs/VERIFICATION.md` actual executed checks

## Toolchain
Python 3.13; local PDF extraction via PyMuPDF; SQLite FTS5; optional numpy/scikit-learn LSA; no external API calls.
