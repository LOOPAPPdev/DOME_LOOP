# SEP-001 / LOOP-FE-001 — plano canónico de execução

## Proveniência e baseline

O spec normativo agora está disponível em `docs/LOOP_DOME_FRONTEND_SPEC_v1.md`, merged em `MANUS` no commit `364e354d8465e97aa1d6a87878326c995c596e1b`. Branch de trabalho: `LOOPAPPdev/DOME_LOOP:MANUS`. Backend: `LOOPAPPdev/loop-agentic-rag:feat/manus-agent-source-import`. O PIPILINE.docx permanece como orientação de pipeline, não substitui o spec publicado.

## Ordem acordada

1. **Iteration A — UX baseline:** rotas de Home, Projects, System App, Infographic, Tutorial, Runs, Knowledge e Settings; navegação; visualização de SystemCase; inspector/evidence selection; demo explicitamente marcado; componentes e tokens existentes preservados.
2. **Iteration B — serviço:** contrato OpenAPI aprovado com o backend, tipos gerados, identidade/sessão, CSRF, BFF em `/api/v1`, operações de projeto/sistema/run/evidence, estados e erros reais.
3. **Iteration C — produto científico:** edição causal versionada, hipóteses/proveniência, projeções de relatório read-only, gates humanos, exportação e auditorias de segurança/acessibilidade.
4. Integração RAG/agentes/ARI_00 só depois do contrato e da autorização. Não declarar integração concluída sem request HTTP real, logs observáveis e resposta rastreável no frontend.

## Decisões preservadas e pendências

- A fonte de verdade de domínio é o SystemCase; posições/seleção React Flow são estado de apresentação. Infográfico e Tutorial não fazem mutações.
- O backend branch já contém `schema_version`, `workflow_version` e revisão textual no schema, validator, scaffolder e exemplo internos. A revisão ainda não é persistida nem implementa ETag/If-Match. O schema snake_case no root DOME é legado (explicitamente marcado); o schema camelCase frontend é apenas o view-model local da demo. Nenhum dos dois é DTO OpenAPI acordado. Tenant/project/system IDs e conflito persistente pertencem à futura fronteira API.
- A identidade não está configurada. A etapa B deve falhar fechada e precisa de sessão autenticada, validação CSRF e autorização backend; um token estático de serviço não representa login de utilizador. Não escolher provedor sem confirmação/documentação.
- Dados de amostra são fictícios; sem sinal “live” ou confiança numérica sem método. Sem base privada, índice, segredo ou URL privada no bundle público.

## Gates

- [x] BA/SN/SR/AR/DE: objetivo, rotas-alvo, responsabilidades, requisitos e ordem lidos do spec canónico; baseline dos dois repositórios inspecionado.
- [x] IP-A: testes red-first observados em vermelho para oito rotas e versionamento SystemCase; implementação do UX baseline sem API.
- [x] VE-A automatizado: 15 testes raiz backend e 23 testes SystemCase por pytest/unittest (inclui validação JSON Schema do example), 8 unit tests de projeção; manifest das oito rotas; typecheck/build; axe sem violações nas oito rotas e navegação móvel aberta a 320px em Light e Dark; 9 E2E para deep links/reload, demo edits, gestures read-only, seleção de aresta e inspector (inclui transição relação→variável), foco/title SPA, menu mobile, keyboard graph selection, evidence cross-highlight, contrastes do grafo/edge labels e temas System/Light/Dark; 7 testes positivos/negativos frontend JSON Schema.
- [ ] IP-B: contratos OpenAPI, BFF autenticado + CSRF, endpoints, estados de erro e persistência otimista/If-Match.
- [ ] VE-B: testes de contrato, identidade/tenant, 401/403/409/422/429/5xx e autorização de evidências.
- [ ] IP-C: integração de RAG, agentes, ARI_00 e evidências com estado real.
- [ ] VE-C: a11y WCAG 2.2 AA, Playwright E2E contra backend local/staging autorizado, logs e resposta real.
- [ ] VE-A manual: revisão de screen reader/teclado no browser real ainda não realizada; axe não prova WCAG AA completo.
- [ ] IP-B/VE-B: bloqueados pela ausência de sessão autenticada P0. Revisão confirmou que o header declara “No authenticated session” e não existem estados de sessão/erro nem rotas protegidas. Faltam aprovação do contrato OpenAPI e decisão documentada de identidade, issuer/audience/JWKS, tenant mapping e política CSRF. Não foi escolhido provedor nem criado BFF/API; as rotas de documentos/busca do backend permanecem sem autenticação e a Pages Function de ficheiros só aceita bearer partilhado, sem ACL por utilizador/tenant. Portanto LOOP-FE-001 não está completo.
- [ ] IP-C/VE-C: RAG/agentes/ARI_00, endpoint HTTP, logs e resposta real continuam não implementados/não testados.
- [x] VA técnica final de Iteration A: as re-revisões adversariais funcionais, de segurança, contratos, a11y e CI/doc foram repetidas; os findings corrigíveis foram fechados e os gates automáticos foram reexecutados. Evidência detalhada e limitações em `.handoff/review.md`. A revisão manual de screen reader/teclado continua pendente; esta validação não certifica WCAG 2.2 AA nem conclui LOOP-FE-001.

## Segurança/entrega

Apenas alterações locais nos branches definidos. Não fazer commit/push/PR adicional, merge, deploy, provisionamento ou escrita externa sem autorização específica. Nunca copiar conteúdo restrito, corpus, SQLite, vetores ou credentials para DOME_LOOP. A publicação do spec já mergeado em `364e354` é a única alteração remota observada nesta retomada. Não declarar integração completa: os testes frontend exercitam exclusivamente fixture fictícia local, sem backend request, run_id, trace ou autorização.
