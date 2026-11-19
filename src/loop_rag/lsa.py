"""Optional offline latent-semantic vectors; not neural model embeddings."""
from __future__ import annotations
from collections import Counter
import json
import math
from pathlib import Path
import re
import sqlite3
from .core import retrieve
from .glossary import expand_query

TOKEN_RE = re.compile(r'\b\w\w+\b', re.UNICODE)


def build_lsa(conn: sqlite3.Connection, path: Path, dimensions: int = 64) -> dict:
    import numpy as np
    from sklearn.decomposition import TruncatedSVD
    from sklearn.feature_extraction.text import TfidfVectorizer
    rows = conn.execute('SELECT chunk_id,content FROM chunks ORDER BY chunk_id').fetchall()
    if len(rows) < 5:
        raise ValueError('At least 5 chunks required for LSA')
    vectorizer = TfidfVectorizer(lowercase=True,strip_accents=None,sublinear_tf=True,
                                 max_features=30000,min_df=2, token_pattern=r'(?u)\b\w\w+\b')
    X=vectorizer.fit_transform([r['content'] for r in rows])
    components_count=min(dimensions,X.shape[0]-1,X.shape[1]-1)
    if components_count<2:
        raise ValueError('Vocabulary too small for LSA')
    svd=TruncatedSVD(n_components=components_count, n_iter=3,random_state=42)
    vectors=svd.fit_transform(X).astype(np.float32)
    vectors /= np.maximum(np.linalg.norm(vectors,axis=1,keepdims=True),1e-12)
    path.parent.mkdir(parents=True,exist_ok=True)
    np.savez_compressed(path,doc_vectors=vectors,components=svd.components_.astype(np.float32),
                        idf=vectorizer.idf_.astype(np.float32),
                        chunk_ids=np.array([r['chunk_id'] for r in rows]))
    path.with_suffix('.vocab.json').write_text(json.dumps({term:int(idx) for term,idx in vectorizer.vocabulary_.items()},ensure_ascii=False,separators=(',',':')),encoding='utf8')
    return {'chunks':len(rows),'features':X.shape[1],'dimensions':components_count,'explained_variance_ratio':float(svd.explained_variance_ratio_.sum()),'method':'LSA (TF-IDF + TruncatedSVD); NOT transformer embeddings'}


def vector_search(conn: sqlite3.Connection, path: Path, question: str, group: str='private', k: int=6) -> list[dict]:
    import numpy as np
    if not path.exists() or not path.with_suffix('.vocab.json').exists():
        raise FileNotFoundError('LSA index missing: run lsa-build')
    bundle=np.load(path,allow_pickle=False)
    vocab=json.loads(path.with_suffix('.vocab.json').read_text(encoding='utf8'))
    counts=Counter(TOKEN_RE.findall(question.lower()))
    q=np.zeros(len(vocab),dtype=np.float32)
    for word,num in counts.items():
        if word in vocab:
            pos=vocab[word]
            q[pos]=(1+math.log(num))*bundle['idf'][pos]
    norm=np.linalg.norm(q)
    if norm < 1e-12:
        return []
    q /= norm
    embedded=q @ bundle['components'].T
    embedded /= max(float(np.linalg.norm(embedded)),1e-12)
    scores=bundle['doc_vectors'] @ embedded
    ids=bundle['chunk_ids']
    output=[]
    # Score all documents first, then apply ACL before truncation.
    for idx in np.argsort(-scores):
        cid=str(ids[idx])
        row=conn.execute('SELECT c.*,s.title AS source_title,s.uri AS source_uri FROM chunks c JOIN sources s USING(source_id) WHERE c.chunk_id=?',(cid,)).fetchone()
        if row is None or (group!='private' and row['access_group']!='public'):
            continue
        result=dict(row)
        result['vector_score']=float(scores[idx])
        result['citation']=f"{row['source_id']} PDF p.{row['page_pdf']} (printed p.{row['page_printed']})" if row['page_printed'] is not None else f"{row['source_id']} document p.{row['page_pdf']}"
        result['tags']=json.loads(row['tags_json'])
        output.append(result)
        if len(output)>=k:
            break
    return output


def hybrid_search(conn: sqlite3.Connection,question: str,lsa_path: Path|None,
                 group: str='private',k:int=6) -> list[dict]:
    expanded=expand_query(question)
    lexical=retrieve(conn,expanded,group=group,k=min(k*4,30))
    vector=vector_search(conn,lsa_path,expanded,group,k=min(k*4,30)) if lsa_path and lsa_path.exists() else []
    by_id={}
    for rank, result in enumerate(lexical,1):
        cid=result['chunk_id'];by_id[cid]=dict(result);by_id[cid]['rrf']=1/(60+rank)
    for rank,result in enumerate(vector,1):
        cid=result['chunk_id']
        if cid not in by_id:
            by_id[cid]=dict(result);by_id[cid]['rrf']=0
        by_id[cid]['rrf'] += 1/(60+rank)
    for item in by_id.values():
        if item['source_id']=='STERMAN-2000' and (item['chapter_no'] is None or item['chapter_no']>=25):
            item['rrf'] *= 0.15  # prevent table-of-contents/index hits from displacing source paragraphs
    return sorted(by_id.values(),key=lambda r:-r['rrf'])[:k]
