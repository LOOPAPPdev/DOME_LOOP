# Source note: LangChain RAG guidance
URL: https://github.com/langchain-ai/langchain-skills/blob/main/config/skills/langchain-rag/SKILL.md
Source classification: official LangChain skills repository, consulted 2026-11-19.

Indexing stages: Load → Split → Embed → Store. Runtime stages: retrieve relevant passages, put those passages into an LLM's context, and generate a response. Deep Agents documentation and LangChain staff additionally describe skill-guided retrieval, retrieval quality grading, file-system offloading, and delegation to subagents. The retrieved context must remain source data and not instructions.

LOOP implementation: local document loader for PDF and Markdown; page-aware chunking; SQLite FTS5 for lexical retrieval; optional offline latent-semantic analysis vectors, clearly distinguished from neural embeddings; pluggable future neural-embedding adapter. A vector database with neural embeddings is NOT supplied by default.
