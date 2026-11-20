import { describe, expect, it } from "vitest"
import { onRequest } from "../../functions/api/v1/[[path]]"

const secret = "unit-test-session-signing-secret-with-length"
const origin = "https://example.test"
const env = {
  ANALYSIS_BACKEND_URL: "https://backend.example.test",
  LOOP_BFF_SESSION_SECRET: secret,
  LOOP_BFF_ALLOWED_ORIGINS: origin,
  LOOP_BFF_MAX_BODY_BYTES: "64",
}

async function signedSession(overrides: Record<string, unknown> = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const claims = { sub: "alice", tenant_id: "tenant-a", iat: now, exp: now + 300, ...overrides }
  const payload = btoa(JSON.stringify(claims)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "")
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  )
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)))
  const signature = btoa(String.fromCharCode(...signed)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "")
  return payload + "." + signature
}

function context(request: Request) {
  return { request, env, params: { path: "analysis" } }
}

describe("Cloudflare BFF request validation", () => {
  it("does not require Origin for a safe same-origin GET", async () => {
    const result = await onRequest(context(new Request(origin + "/api/v1/analysis")))
    expect(result.status).toBe(401)
  })

  it("converts malformed cookies to 401, never 500", async () => {
    const request = new Request(origin + "/api/v1/analysis", {
      headers: { Cookie: "loop_session=%%%..bad", Origin: origin },
    })
    const result = await onRequest(context(request))
    expect(result.status).toBe(401)
  })

  it("rejects expired signed sessions", async () => {
    const cookie = await signedSession({ iat: 1, exp: 2 })
    const request = new Request(origin + "/api/v1/analysis", {
      headers: { Cookie: "loop_session=" + cookie, Origin: origin },
    })
    expect((await onRequest(context(request))).status).toBe(401)
  })

  it("rejects a body exceeding the actual byte limit without Content-Length", async () => {
    const session = await signedSession()
    const csrf = "a".repeat(20)
    const request = new Request(origin + "/api/v1/analysis", {
      method: "POST",
      headers: {
        Origin: origin, "Content-Type": "application/json",
        Cookie: "loop_session=" + session + "; loop_csrf=" + csrf,
        "X-CSRF-Token": csrf,
      },
      body: JSON.stringify({ question: "a".repeat(100) }),
    })
    expect(request.headers.get("Content-Length")).toBe(null)
    const result = await onRequest(context(request))
    expect(result.status).toBe(413)
  })

  it("requires Origin on state-changing requests", async () => {
    const request = new Request(origin + "/api/v1/analysis", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "x" }),
    })
    expect((await onRequest(context(request))).status).toBe(403)
  })
})
