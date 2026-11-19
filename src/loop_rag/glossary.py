"""Conservative PT → EN terminology expansion for an English scientific source.
Not general machine translation. Entries must be reviewed for new domains.
"""
from __future__ import annotations
import unicodedata

TERMS={
    'pensamento sistemico':'systems thinking',
    'dinamica de sistemas':'system dynamics',
    'problema sistemico':'system problem articulation',
    'hipotese dinamica':'dynamic hypothesis',
    'modelo do iceberg':'iceberg systems thinking',
    'diagramas causais':'causal loop diagrams',
    'diagrama causal':'causal loop diagram',
    'loops causais':'causal feedback loops',
    'lacos causais':'causal feedback loops',
    'ciclos de feedback':'feedback loops',
    'estoques e fluxos':'stocks and flows',
    'estoques':'stocks',
    'fluxos':'flows',
    'consistencia dimensional':'dimensional consistency',
    'validacao':'validation model testing',
    'validar':'model testing validation',
    'pontos de alavancagem':'leverage points',
    'alavancagem':'leverage',
    'atrasos':'delays',
    'tempo de atraso':'time delay',
    'simulacao':'simulation',
    'regras de decisao':'decision rules',
    'tomada de decisao':'decision making',
    'arquétipos':'archetypes',
    'arquetipos':'archetypes',
    'cadeia de suprimentos':'supply chain',
    'qualidade':'quality',
    'teste de condicao extrema':'extreme condition tests',
}

def _fold(text: str) -> str:
    text=unicodedata.normalize('NFKD',text.lower())
    return ''.join(c for c in text if not unicodedata.combining(c))

def expand_query(question: str) -> str:
    text=_fold(question)
    expansions=[]
    for phrase, english in sorted(TERMS.items(),key=lambda t:-len(t[0])):
        if _fold(phrase) in text and english not in expansions:
            expansions.append(english)
    if not expansions:
        return question
    return (question+' '+ ' '.join(expansions[:6]))[:2000]
