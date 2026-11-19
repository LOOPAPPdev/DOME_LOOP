# Source note: OWASP generative AI security guidance
URL: https://genai.owasp.org/llm-top-10/
Source classification: OWASP GenAI Security Project, 2025 risk taxonomy consulted 2026-11-19.

Threats relevant to RAG include prompt injection within retrieved documents, disclosure of sensitive information, excessive agent authority, data/model poisoning, and vector or embedding weaknesses. Retrieval results from untrusted sources must never override system or developer policies. Access filters must be applied at retrieval time. External actions must require explicit authorization and be logged.

LOOP prototype security requirement: no credential in repository, no network calls by default, local isolated source files, source-level access groups, deterministic authorization checks, no direct execution of retrieved text, and non-executable specialist handoffs.
