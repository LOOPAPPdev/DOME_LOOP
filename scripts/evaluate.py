from contextlib import closing
"""Tiny smoke benchmark, not a statistically representative evaluation."""
from pathlib import Path
import argparse,json,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from loop_rag.core import connect
from loop_rag.lsa import hybrid_search

def main():
    p=argparse.ArgumentParser();p.add_argument('--db',required=True);p.add_argument('--lsa');p.add_argument('--k',type=int,default=5)
    args=p.parse_args()
    gold=json.loads((ROOT/'evals/gold_queries.json').read_text())
    with closing(connect(args.db)) as c:
        rows=[]
        for item in gold:
            matches=hybrid_search(c,item['query'],Path(args.lsa) if args.lsa else None,k=args.k)
            match= next((r for r in matches if r['chapter_no']==item['expected_chapter']),None) if 'expected_chapter' in item else next((r for r in matches if r['source_id']==item['expected_source']),None)
            rows.append({'id':item['id'],'passed':match is not None,'hits':[r['chunk_id'] for r in matches]})
        out={'k':args.k,'passed':sum(r['passed'] for r in rows),'total':len(rows),'recall_at_k':sum(r['passed'] for r in rows)/len(rows),'details':rows}
        print(json.dumps(out,indent=2));return 0 if out['passed']==len(rows) else 1
if __name__=='__main__': raise SystemExit(main())
