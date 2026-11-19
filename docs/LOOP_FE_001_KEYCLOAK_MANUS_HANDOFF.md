# LOOP-FE-001 — Manus handoff: real Keycloak OIDC

## Authoritative implementation
The OIDC verifier and local Keycloak configuration are implemented on branch `feat/loop-fe-001-keycloak-oidc` in `LOOPAPPdev/loop-agentic-rag`. Do not duplicate identity logic in DOME_LOOP.

## Manus execution
1. Inspect both repositories and current LOOP-FE-001 execution report.
2. Review and run tests for the OIDC branch; adjust existing synthetic-auth tests to explicitly opt into local synthetic mode. Never enable synthetic auth in staging.
3. Provision Keycloak from `infra/keycloak/compose.yaml` using a unique admin secret. Confirm actual OIDC discovery and JWKS HTTP responses.
4. Configure trusted tenant mapping and roles in Keycloak; issue a real access token with `aud=loop-api`, then verify /v1/me positive and negative tests.
5. Connect DOME_LOOP → BFF → FastAPI using authorized staging, PKCE, secure cookies, CSRF and explicit session/revocation policy. Do not pass tokens in browser URLs.
6. Execute HTTP trace DOME_LOOP → BFF → FastAPI → RAG → ARI_00 and record sanitized correlation IDs.
7. Update PASS/FAIL/BLOCKED matrix only with executed evidence. Request approval for staging policies, external IdP acceptance, and production promotion.

## Boundaries
No live IdP or end-to-end staging test has been executed by this GitHub-only handoff. The local Keycloak realm is a development fixture, not approved production configuration. Maintain fail-closed.
