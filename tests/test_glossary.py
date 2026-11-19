import sys, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from loop_rag.glossary import expand_query
class TestGlossary(unittest.TestCase):
    def test_domain_translation(self):
        q=expand_query('Como validar um diagrama causal de dinâmica de sistemas?')
        self.assertIn('validation',q)
        self.assertIn('causal loop diagram',q)
        self.assertIn('system dynamics',q)
    def test_no_change_to_unrelated(self):
        self.assertEqual(expand_query('hello unrelated'),'hello unrelated')
if __name__=='__main__':unittest.main()
