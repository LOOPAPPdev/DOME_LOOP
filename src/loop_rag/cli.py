"""Command line entry for local indexing and retrieval."""
from __future__ import annotations
from contextlib import closing
import argparse
import json
from pathlib import Path
from .core import connect,initialize,ingest_pdf,ingest_text,retrieve
from .lsa import build_lsa,hybrid_search
from .runtime import run_investigation
from .langgraph_workflow import run_langgraph


def main(argv=None):
    ap=argparse.ArgumentParser(prog='loop-rag',description='LOOP Dynamics evidence-first RAG')
    sp=ap.add_subparsers(dest='cmd',required=True)
    build=sp.add_parser('build');build.add_argument('--db',required=True);build.add_argument('--pdf');build.add_argument('--notes-dir');build.add_argument('--page-offset',type=int,default=0)
    ix=sp.add_parser('lsa-build');ix.add_argument('--db',required=True);ix.add_argument('--out',required=True);ix.add_argument('--dimensions',type=int,default=64)
    for cmd in ['search','investigate']:
        p=sp.add_parser(cmd);p.add_argument('--db',required=True);p.add_argument('--question',required=True);p.add_argument('--lsa');p.add_argument('--k',type=int,default=6);p.add_argument('--group',choices=['public','private'],default='private')
        if cmd=='investigate':p.add_argument('--out',required=True)
    lg=sp.add_parser('langgraph');lg.add_argument('--db',required=True);lg.add_argument('--question',required=True);lg.add_argument('--lsa');lg.add_argument('--out');lg.add_argument('--k',type=int,default=6);lg.add_argument('--group',choices=['public','private'],default='private')
    stat=sp.add_parser('stats');stat.add_argument('--db',required=True)
    args=ap.parse_args(argv)
    if args.cmd=='build':
        path=Path(args.db);path.parent.mkdir(parents=True,exist_ok=True)
        with closing(connect(path)) as c:
            initialize(c);results={}
            if args.pdf:
                source=Path(args.pdf)
                results['sterman_pdf']=ingest_pdf(c,'STERMAN-2000',source,page_offset=args.page_offset,title='Business Dynamics — John D. Sterman (2000)')
            if args.notes_dir:
                for p in sorted(Path(args.notes_dir).glob('*.md')):
                    first=p.read_text('utf8').splitlines()
                    meta={}
                    for line in first[:6]:
                        if line.startswith('URL: '):meta['url']=line[5:].strip()
                    sid='NOTE-'+p.stem.upper().replace('_','-')
                    results[sid]=ingest_text(c,sid,p,title=p.stem.replace('_',' '),url=meta.get('url',p.name))
            print(json.dumps(results,ensure_ascii=False,indent=2))
    elif args.cmd=='lsa-build':
        with closing(connect(args.db)) as c:
            print(json.dumps(build_lsa(c,Path(args.out),dimensions=args.dimensions),indent=2))
    elif args.cmd=='search':
        with closing(connect(args.db)) as c:
            results=hybrid_search(c,args.question,Path(args.lsa) if args.lsa else None,args.group,args.k)
            print(json.dumps([{'chunk_id':r['chunk_id'],'citation':r['citation'],'chapter':r['chapter'],'source':r['source_title'],
                'snippet':r['content'][:350]} for r in results],ensure_ascii=False,indent=2))
    elif args.cmd=='investigate':
        report=run_investigation(Path(args.db),args.question,output=Path(args.out),lsa=Path(args.lsa) if args.lsa else None,group=args.group,k=args.k)
        print(json.dumps(report,ensure_ascii=False,indent=2))
    elif args.cmd=='langgraph':
        report=run_langgraph(Path(args.db),args.question,output=Path(args.out) if args.out else None,
                             lsa=Path(args.lsa) if args.lsa else None,group=args.group,k=args.k)
        print(json.dumps(report,ensure_ascii=False,indent=2))
    elif args.cmd=='stats':
        with closing(connect(args.db)) as c:
            print(json.dumps({'sources':c.execute('SELECT COUNT(*) FROM sources').fetchone()[0],
                'chunks':c.execute('SELECT COUNT(*) FROM chunks').fetchone()[0],
                'fts_rows':c.execute('SELECT COUNT(*) FROM chunks_fts').fetchone()[0],
                'page_count':c.execute('SELECT COUNT(DISTINCT source_id||page_pdf) FROM chunks').fetchone()[0],
                'claims_verified':c.execute("SELECT COUNT(*) FROM claims WHERE verification_status='verified'").fetchone()[0]},indent=2))

if __name__=='__main__': main()
