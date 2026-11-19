from contextlib import closing
"""Comparison benchmark: hybrid vs lexical, exact target at top1/top5.
Design-set questions are NOT an independent production evaluation.
"""
from pathlib import Path
import sys,json
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from loop_rag.core import connect,retrieve
from loop_rag.lsa import hybrid_search

def benchmark(db,lsa):
    gold=json.loads((ROOT/'evals/gold_queries.json').read_text())
    result=[]
    with closing(connect(db)) as c:
        for name,mode in [('lexical',False),('hybrid',True)]:
            runs=[]
            for case in gold:
                hits=(hybrid_search(c,case['query'],Path(lsa),k=5) if mode else retrieve(c,case['query'],k=5))
                labels=[(h['chapter_no'] if 'expected_chapter' in case else h['source_id']) for h in hits]
                expected=case.get('expected_chapter',case.get('expected_source'))
                try: rank=labels.index(expected)+1
                except ValueError:rank=None
                runs.append({'id':case['id'],'found_at_rank':rank,'top_hit':hits[0]['chunk_id'] if hits else None})
            result.append({'method':name,'n':len(runs),'hit_at_1':sum(x['found_at_rank']==1 for x in runs),
                 'recall_at_5':sum(x['found_at_rank'] is not None for x in runs),
                 'mrr_at_5':round(sum(1/x['found_at_rank'] for x in runs if x['found_at_rank'])/len(runs),3),
                 'rows':runs})
    return result
if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--db',required=True);p.add_argument('--lsa',required=True);p.add_argument('--out',required=True)
    arg=p.parse_args();report=benchmark(arg.db,arg.lsa)
    Path(arg.out).write_text(json.dumps(report,indent=2))
    print(json.dumps([{k:r[k] for k in ['method','n','hit_at_1','recall_at_5','mrr_at_5']} for r in report],indent=2))
