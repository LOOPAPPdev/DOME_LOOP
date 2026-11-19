"""Deterministic, page-aware ingestion and SQLite FTS5 retrieval."""
from __future__ import annotations
import hashlib
import json
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

MAX_FILE_BYTES = 100 * 1024 * 1024
CHAPTERS = [
    (3, 1, 'Learning in and about Complex Systems'),
    (41, 2, 'System Dynamics in Action'),
    (83, 3, 'The Modeling Process'),
    (107, 4, 'Structure and Behavior of Dynamic Systems'),
    (137, 5, 'Causal Loop Diagrams'),
    (191, 6, 'Stocks and Flows'),
    (231, 7, 'Dynamics of Stocks and Flows'),
    (263, 8, 'Closing the Loop'),
    (295, 9, 'S-Shaped Growth'),
    (349, 10, 'Path Dependence and Positive Feedback'),
    (409, 11, 'Delays'),
    (469, 12, 'Coflows and Aging Chains'),
    (513, 13, 'Modeling Decision Making'),
    (551, 14, 'Formulating Nonlinear Relationships'),
    (597, 15, 'Modeling Human Behavior'),
    (631, 16, 'Forecasts and Fudge Factors'),
    (663, 17, 'Supply Chains and the Origin of Oscillations'),
    (709, 18, 'The Manufacturing Supply Chain'),
    (757, 19, 'The Labor Supply Chain'),
    (791, 20, 'Commodity Cycles'),
    (845, 21, 'Validation and Model Testing'),
    (895, 22, 'Challenges for the Future'),
    (903, 23, 'Appendix: Numerical Integration'),
    (913, 24, 'Appendix: Noise'),
    (925, 25, 'References'),
    (947, 26, 'Index'),
]
TAXONOMY = {
    'problem_framing': ['problem articulation', 'problem definition', 'boundary selection', 'reference mode', 'time horizon'],
    'iceberg': ['iceberg', 'events', 'patterns', 'structures', 'mental models'],
    'causal_mapping': ['causal loop', 'polarity', 'reinforcing', 'balancing', 'feedback'],
    'dynamic_model': ['stocks', 'flows', 'accumulation', 'rate equation', 'delays', 'nonlinear'],
    'simulation': ['simulation', 'model behavior', 'sensitivity', 'parameters'],
    'validation': ['validation', 'model testing', 'boundary adequacy', 'dimensional consistency', 'extreme condition'],
    'intervention': ['leverage', 'policy design', 'intervention', 'roadmap', 'system improvement'],
    'agentic_rag': ['retrieval', 'embed', 'vector store', 'subagent', 'agentic', 'rag'],
    'governance': ['authorization', 'prompt injection', 'access control', 'approval', 'provenance'],
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalized(text: str) -> str:
    # Conservative: preserve negation, sign symbols, and ordinary punctuation.
    return re.sub(r'[ \t]+', ' ', text.replace('\x00', '')).replace('\r\n','\n').strip()


def chunk_text(text: str, limit: int = 1000, overlap: int = 140) -> Iterator[tuple[int, int, str]]:
    if not 200 <= limit <= 4000 or not 0 <= overlap <= limit // 3:
        raise ValueError('Invalid chunk dimensions')
    if not text.strip():
        return
    n = len(text)
    start = 0
    while start < n:
        end = min(n, start + limit)
        if end < n:
            boundary = max(text.rfind('\n', start + limit//2, end), text.rfind('. ', start+limit//2, end))
            if boundary > start + limit//2:
                end = boundary + (2 if text[boundary:boundary+2] == '. ' else 1)
        if end <= start:  # termination safety
            end = min(n, start + limit)
        content = text[start:end].strip()
        if content:
            yield (start, end, content)
        if end == n:
            break
        start = max(start + 1, end - overlap)


def chapter_for_printed_page(printed_page: int | None) -> tuple[int | None, str]:
    if printed_page is None or printed_page < 3:
        return None, 'Front matter'
    chapter = max((row for row in CHAPTERS if row[0] <= printed_page), default=CHAPTERS[0])
    return chapter[1], chapter[2]


def topic_tags(text: str, chapter: str) -> list[str]:
    sample = (text + ' ' + chapter).lower()
    return [name for name, phrases in TAXONOMY.items() if any(word in sample for word in phrases)]


def connect(db_path: str | Path) -> sqlite3.Connection:
    c = sqlite3.connect(str(db_path))
    c.row_factory = sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON')
    return c


def initialize(c: sqlite3.Connection) -> None:
    c.executescript('''
    CREATE TABLE IF NOT EXISTS sources (
       source_id TEXT PRIMARY KEY, title TEXT NOT NULL, uri TEXT NOT NULL,
       kind TEXT NOT NULL, sha256 TEXT NOT NULL, license TEXT NOT NULL,
       access_group TEXT NOT NULL, added_utc TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       version TEXT NOT NULL, extraction_method TEXT NOT NULL, metadata_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chunks (
       chunk_id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(source_id),
       page_pdf INTEGER, page_printed INTEGER, chapter_no INTEGER, chapter TEXT NOT NULL,
       chunk_no INTEGER NOT NULL, start_char INTEGER NOT NULL, end_char INTEGER NOT NULL,
       content TEXT NOT NULL, sha256 TEXT NOT NULL, tags_json TEXT NOT NULL,
       qa_flags_json TEXT NOT NULL, access_group TEXT NOT NULL
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
       content, chunk_id UNINDEXED, source_id UNINDEXED, tokenize='unicode61 remove_diacritics 2'
    );
    CREATE TABLE IF NOT EXISTS claims (
       claim_id TEXT PRIMARY KEY, text TEXT NOT NULL, claim_kind TEXT NOT NULL,
       verification_status TEXT NOT NULL CHECK(verification_status IN ('verified','unverified','refuted')),
       evidence_chunk_ids_json TEXT NOT NULL, falsification_test TEXT,
       reviewer TEXT, created_utc TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS causal_edges (
       edge_id TEXT PRIMARY KEY, source_variable TEXT NOT NULL, target_variable TEXT NOT NULL,
       polarity TEXT NOT NULL CHECK(polarity IN ('+','-','unknown')),
       verification_status TEXT NOT NULL, evidence_chunk_ids_json TEXT NOT NULL,
       delay TEXT NOT NULL DEFAULT 'unknown'
    );
    CREATE TABLE IF NOT EXISTS agent_runs (
       run_id TEXT PRIMARY KEY, task_id TEXT NOT NULL, role TEXT NOT NULL,
       status TEXT NOT NULL, input_ref TEXT NOT NULL, output_ref TEXT,
       approval_status TEXT NOT NULL, metrics_json TEXT NOT NULL,
       created_utc TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS chunks_source ON chunks(source_id, page_pdf);
    ''')
    c.commit()


def ingest_pdf(c: sqlite3.Connection, source_id: str, path: Path, *, page_offset: int = 0,
               title: str = '', access_group: str = 'private', license_name: str = 'user-provided restricted',
               limit: int = 1000, overlap: int = 140) -> dict:
    import fitz
    if not path.is_file() or path.suffix.lower() != '.pdf' or path.stat().st_size > MAX_FILE_BYTES:
        raise ValueError('PDF must exist, have a .pdf suffix, and be <=100 MiB')
    doc_hash = sha256(path.read_bytes())
    doc = fitz.open(str(path))
    if doc.is_encrypted:
        raise ValueError('Encrypted PDF is not supported')
    counts = {'pages': len(doc), 'pages_indexed': 0, 'short_text_pages': 0, 'chunks': 0,
              'pages_with_illustrations': 0, 'quality_warnings': []}
    with c:
        c.execute('DELETE FROM chunks_fts WHERE source_id=?', (source_id,))
        c.execute('DELETE FROM chunks WHERE source_id=?', (source_id,))
        c.execute('DELETE FROM sources WHERE source_id=?', (source_id,))
        c.execute('INSERT INTO sources(source_id,title,uri,kind,sha256,license,access_group,version,extraction_method,metadata_json) VALUES(?,?,?,?,?,?,?,?,?,?)',
            (source_id, title or path.stem, path.name, 'pdf', doc_hash, license_name, access_group, '2000' if source_id=='STERMAN-2000' else 'unspecified', 'pymupdf text layer', json.dumps({'page_offset':page_offset})))
        for page_pos, page in enumerate(doc):
            pdf_page = page_pos+1
            printed = (pdf_page-page_offset) if page_offset and (pdf_page-page_offset)>0 else None
            chapter_no, chapter = chapter_for_printed_page(printed)
            raw = normalized(page.get_text('text'))
            flags = []
            image_count = len(page.get_images(full=True))
            if image_count:
                counts['pages_with_illustrations'] += 1
            if len(raw) < 180:
                counts['short_text_pages'] += 1
                flags.append('short_text_or_image_dominant')
            if not raw:
                counts['quality_warnings'].append(f'PDF page {pdf_page} has no extracted text')
                continue
            counts['pages_indexed'] += 1
            for chunk_num, (start,end,text) in enumerate(chunk_text(raw, limit,overlap),1):
                chunk_id = f'{source_id}-P{pdf_page:04d}-C{chunk_num:03d}'
                tags = topic_tags(text,chapter)
                c.execute('''INSERT INTO chunks(chunk_id,source_id,page_pdf,page_printed,chapter_no,chapter,chunk_no,start_char,end_char,content,sha256,tags_json,qa_flags_json,access_group)
                             VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                    (chunk_id,source_id,pdf_page,printed,chapter_no,chapter,chunk_num,start,end,text,sha256(text.encode()),json.dumps(tags),json.dumps(flags),access_group))
                c.execute('INSERT INTO chunks_fts(content,chunk_id,source_id) VALUES(?,?,?)',(text,chunk_id,source_id))
                counts['chunks'] += 1
    doc.close()
    return counts


def ingest_text(c: sqlite3.Connection, source_id: str, path: Path, *, title: str,
                url: str, access_group: str = 'public', license_name: str = 'author-created source summary',
                limit: int = 1000, overlap: int = 140) -> dict:
    if not path.is_file() or path.suffix.lower() not in {'.md','.txt'} or path.stat().st_size > MAX_FILE_BYTES:
        raise ValueError('Unsupported note file')
    rawbytes = path.read_bytes()
    raw = normalized(rawbytes.decode('utf-8'))
    chunks=0
    with c:
        c.execute('DELETE FROM chunks_fts WHERE source_id=?',(source_id,))
        c.execute('DELETE FROM chunks WHERE source_id=?',(source_id,))
        c.execute('DELETE FROM sources WHERE source_id=?',(source_id,))
        c.execute('INSERT INTO sources(source_id,title,uri,kind,sha256,license,access_group,version,extraction_method,metadata_json) VALUES(?,?,?,?,?,?,?,?,?,?)',
            (source_id,title,url,'curated_note',sha256(rawbytes),license_name,access_group,'2026-11-19','manual, source-cited paraphrase', '{}'))
        for num,(start,end,text) in enumerate(chunk_text(raw,limit,overlap),1):
            chunk_id=f'{source_id}-P0001-C{num:03d}'
            c.execute('''INSERT INTO chunks(chunk_id,source_id,page_pdf,page_printed,chapter_no,chapter,chunk_no,start_char,end_char,content,sha256,tags_json,qa_flags_json,access_group)
                         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                (chunk_id,source_id,1,None,None,title,num,start,end,text,sha256(text.encode()),json.dumps(topic_tags(text,title)),json.dumps([]),access_group))
            c.execute('INSERT INTO chunks_fts(content,chunk_id,source_id) VALUES(?,?,?)',(text,chunk_id,source_id));chunks+=1
    return {'pages':1, 'pages_indexed':1,'chunks':chunks}


def retrieve(c: sqlite3.Connection, question: str, *, group: str='private', k: int=6, chapter: int|None=None) -> list[dict]:
    if not question.strip() or len(question)>2000:
        raise ValueError('Question must be 1–2000 characters')
    if not 1 <= k <= 30:
        raise ValueError('k out of range')
    # Explicit ACL: private sees public+private; public cannot see private chunks.
    tokens = re.findall(r'\w+', question.lower(), re.UNICODE)
    tokens = [t for t in tokens if len(t)>1]
    if not tokens:
        return []
    expression = ' OR '.join('"'+t.replace('"','')+'"' for t in list(dict.fromkeys(tokens))[:16])
    clauses = ['chunks_fts MATCH ?', 'c.access_group IN ('+ ('?,?' if group=='private' else '?') + ')']
    params: list = [expression] + (['public','private'] if group=='private' else ['public'])
    if chapter is not None:
        clauses.append('c.chapter_no=?');params.append(chapter)
    sql = '''SELECT c.*, s.title AS source_title, s.uri AS source_uri, bm25(chunks_fts) AS bm
             FROM chunks_fts JOIN chunks c ON c.chunk_id=chunks_fts.chunk_id JOIN sources s ON s.source_id=c.source_id
             WHERE ''' + ' AND '.join(clauses) + " ORDER BY CASE WHEN c.source_id='STERMAN-2000' AND (c.chapter_no IS NULL OR c.chapter_no >= 25) THEN 1 ELSE 0 END, bm LIMIT ?"
    params.append(k)
    try:
        rows = c.execute(sql,params).fetchall()
    except sqlite3.OperationalError as exc:
        raise RuntimeError('FTS query error') from exc
    return [{**dict(r), 'tags':json.loads(r['tags_json']), 'qa_flags':json.loads(r['qa_flags_json']), 'citation':f"{r['source_id']} PDF p.{r['page_pdf']} (printed p.{r['page_printed']})" if r['page_printed'] is not None else f"{r['source_id']} document p.{r['page_pdf']}"} for r in rows]
