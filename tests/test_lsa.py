from contextlib import closing
import sys, tempfile, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from loop_rag.core import connect,initialize,ingest_text
from loop_rag.lsa import build_lsa,vector_search
class LsaTest(unittest.TestCase):
    def test_roundtrip_json_vocab_numpy_int64(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);note=p/'notes.md';note.write_text('Causal structure and feedback loops are necessary for systems modeling.\n'*100)
            with closing(connect(p/'test.sqlite')) as c:
                initialize(c);ingest_text(c,'NOTE',note,title='Causal',url='example',limit=400,overlap=50)
                output=p/'lsa.npz'
                report=build_lsa(c,output,dimensions=8)
                self.assertGreater(report['chunks'],4)
                self.assertTrue(output.with_suffix('.vocab.json').exists())
                found=vector_search(c,output,'causal feedback loops')
                self.assertGreater(len(found),0)
if __name__=='__main__':unittest.main()

class LsaSecurityTest(unittest.TestCase):
    def test_public_vector_index_does_not_return_private_chunks(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);private=p/'p.md';public=p/'u.md'
            private.write_text('Sensitive strategy information and internal causal loops.\n'*80)
            public.write_text('Public strategy information and causal loop concepts.\n'*80)
            with closing(connect(p/'test.sqlite')) as c:
                initialize(c)
                ingest_text(c,'PRIVATE',private,title='private',url='local',access_group='private',limit=350,overlap=70)
                ingest_text(c,'PUBLIC',public,title='public',url='local',access_group='public',limit=350,overlap=70)
                out=p/'lsa.npz'
                build_lsa(c,out,dimensions=8)
                hits=vector_search(c,out,'sensitive internal causal strategy',group='public',k=10)
                self.assertTrue(hits)
                self.assertTrue(all(hit['source_id']=='PUBLIC' for hit in hits))
