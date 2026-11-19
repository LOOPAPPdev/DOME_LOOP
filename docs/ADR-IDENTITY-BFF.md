# BFF identity boundary

The Pages Function at `/api/v1/*` is same-origin only. It requires configured `BACKEND_API_URL`, `LOOP_BFF_SESSION_SECRET` and `LOOP_BFF_ALLOWED_ORIGINS`; missing configuration returns `503`. It validates an HMAC-signed `loop_session` cookie, requires a matching `loop_csrf` cookie and `X-CSRF-Token` header on state-changing methods, bounds JSON request size, adds a redacted trace ID, and returns structured errors.

The browser calls relative `/api/v1/*` paths through `frontend/src/shared/api/client.ts`; it never receives the backend URL or a service credential. The function does not select an identity provider or mint sessions. Production session issuance, cookie policy, issuer/audience/JWKS, tenant mapping and revocation remain external approvals and are intentionally fail-closed.

Upstream retries are not performed. A timeout produces a safe `502`; rate limiting produces `429` with `Retry-After`; upstream response bodies are passed through without exposing configuration secrets. Integration is not considered live until an approved staging backend and authenticated session exercise the complete HTTP path.
