"""Controlled Portuguese terminology smoke test. Not a multilingual benchmark."""
import sys,json,argparse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from contextlib import closing
from loop_rag.core import connect
from loop_rag.lsa import hybrid_search

def main():
    p=argparse.ArgumentParser();p.add_argument('--db',required=True);p.add_argument('--lsa',required=True);p.add_argument('--out',required=True)
    a=p.parse_args();items=json.loads((ROOT/'evals/pt_queries.json').read_text())
    results=[]
    with closing(connect(a.db)) as c:
        for case in items:
            hits=hybrid_search(c,case['query'],Path(a.lsa),k=5)
            expected=case.get('expected_chapter',case.get('expected_source'))
            labels=[(h['chapter_no'] if 'expected_chapter' in case else h['source_id']) for h in hits]
            rank=labels.index(expected)+1 if expected in labels else None
            results.append({'id':case['id'],'expected':expected,'rank':rank,'top_chunk':hits[0]['chunk_id'] if hits else None})
    report={'n':len(results),'hit_at_1':sum(r['rank']==1 for r in results),'recall_at_5':sum(r['rank'] is not None for r in results), 'details':results}
    Path(a.out).write_text(json.dumps(report,indent=2,ensure_ascii=False))
    print(json.dumps({k:report[k] for k in ['n','hit_at_1','recall_at_5']},indent=2))
if __name__=='__main__':main()
