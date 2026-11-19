from contextlib import closing
"""Deterministic source-reference checks; returns nonzero for blocking problems."""
from pathlib import Path
import hashlib,json,sys,argparse
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from loop_rag.core import connect

def check(path:Path):
    findings=[]
    with closing(connect(path)) as c:
        sources={r['source_id']:dict(r) for r in c.execute('SELECT * FROM sources')}
        chunks=c.execute('SELECT * FROM chunks').fetchall()
        fts=c.execute('SELECT COUNT(*) FROM chunks_fts').fetchone()[0]
        if len(chunks)!=fts:findings.append('Chunk and FTS row counts differ')
        for row in chunks:
            if row['source_id'] not in sources:findings.append('Missing source '+row['source_id'])
            if hashlib.sha256(row['content'].encode()).hexdigest()!=row['sha256']:
                findings.append('Content checksum mismatch '+row['chunk_id'])
            if row['start_char'] >= row['end_char']:
                findings.append('Invalid page offsets '+row['chunk_id'])
            if not row['access_group'] in ['public','private']:
                findings.append('Invalid ACL label '+row['chunk_id'])
        return {'sources':len(sources),'chunks':len(chunks),'fts':fts,
          'verified_chunk_checksums':len(chunks)-sum('Content checksum mismatch' in f for f in findings),
          'findings':findings,'passed':not findings}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--db',required=True);a=p.parse_args()
    r=check(Path(a.db));print(json.dumps(r,indent=2));sys.exit(0 if r['passed'] else 1)
