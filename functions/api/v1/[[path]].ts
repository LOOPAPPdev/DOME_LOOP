interface Env {
  ANALYSIS_BACKEND_URL?: string;
  ANALYSIS_BACKEND_TOKEN?: string;
  LOOP_BFF_SESSION_SECRET?: string;
  LOOP_BFF_ALLOWED_ORIGINS?: string;
  LOOP_BFF_MAX_BODY_BYTES?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
  params: Record<string, string | string[] | undefined>;
}

const requestCounts = new Map<string, { count: number; reset: number }>();
const stateChanging = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function json(status: number, code: string, message: string, traceId: string): Response {
  return new Response(JSON.stringify({ error: { code, message, trace_id: traceId } }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function traceId(): string {
  return crypto.randomUUID();
}

function pathOf(context: PagesContext): string {
  const value = context.params.path;
  const parts = Array.isArray(value) ? value : value ? [value] : [];
  return parts.map((part) => encodeURIComponent(part)).join("/");
}

function upstreamPath(context: PagesContext): string {
  const logicalPath = pathOf(context);
  if (logicalPath === "analysis") return "/analysis/v1";
  return `/v1/${logicalPath}`;
}

function allowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin");
  const configured = env.LOOP_BFF_ALLOWED_ORIGINS?.split(",").map((item) => item.trim()).filter(Boolean);
  if (!configured || configured.length === 0) return false;
  // Browsers do not normally attach Origin to same-origin GET/HEAD requests.
  if (!origin) return request.method === "GET" || request.method === "HEAD";
  return configured.includes(origin);
}

async function validSession(request: Request, secret: string): Promise<boolean> {
  const raw = request.headers.get("Cookie")?.match(/(?:^|;\s*)loop_session=([^;]+)/u)?.[1];
  if (!raw || raw.length > 4096) return false;
  const parts = raw.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  try {
    const [payload, encodedSignature] = parts;
    const decoded = atob(payload.replaceAll("-", "+").replaceAll("_", "/"));
    const claims = JSON.parse(decoded) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof claims.sub !== "string" || !claims.sub ||
      typeof claims.tenant_id !== "string" || !claims.tenant_id ||
      typeof claims.iat !== "number" || typeof claims.exp !== "number" ||
      !Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) ||
      claims.iat > now + 30 || claims.exp <= now ||
      claims.exp <= claims.iat || claims.exp - claims.iat > 3600
    ) return false;
    const signature = Uint8Array.from(
      atob(encodedSignature.replaceAll("-", "+").replaceAll("_", "/")),
      (char) => char.charCodeAt(0),
    );
    if (signature.length !== 32) return false;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
    );
    return crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(payload));
  } catch {
    // Malformed cookies must fail as 401, not throw a 500.
    return false;
  }
}

async function readLimitedBody(request: Request, max: number): Promise<ArrayBuffer | null> {
  if (!request.body) return new ArrayBuffer(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result.buffer;
}

function csrfValid(request: Request): boolean {
  const cookie = request.headers.get("Cookie")?.match(/(?:^|;\s*)loop_csrf=([^;]+)/u)?.[1];
  const header = request.headers.get("X-CSRF-Token");
  return Boolean(cookie && header && cookie === header && cookie.length >= 16);
}

function rateLimited(request: Request): boolean {
  const key = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const now = Date.now();
  const previous = requestCounts.get(key);
  if (!previous || previous.reset <= now) {
    requestCounts.set(key, { count: 1, reset: now + 60_000 });
    return false;
  }
  previous.count += 1;
  return previous.count > 60;
}

export const onRequest = async (context: PagesContext): Promise<Response> => {
  const id = traceId();
  const { request, env } = context;
  if (!env.ANALYSIS_BACKEND_URL || !env.LOOP_BFF_SESSION_SECRET || !env.LOOP_BFF_ALLOWED_ORIGINS) {
    return json(503, "BFF_NOT_CONFIGURED", "Authenticated BFF is not configured", id);
  }
  if (!allowedOrigin(request, env)) return json(403, "ORIGIN_DENIED", "Origin is not allowed", id);
  if (!(await validSession(request, env.LOOP_BFF_SESSION_SECRET))) return json(401, "UNAUTHENTICATED", "Authenticated session required", id);
  if (stateChanging.has(request.method) && !csrfValid(request)) return json(403, "CSRF_DENIED", "Valid CSRF token required", id);
  if (rateLimited(request)) return new Response(JSON.stringify({ error: { code: "RATE_LIMITED", message: "Retry later", trace_id: id } }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60", "Cache-Control": "no-store" } });
  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const max = Number(env.LOOP_BFF_MAX_BODY_BYTES ?? "1048576");
    if (!Number.isSafeInteger(max) || max < 1 || max > 10485760) {
      return json(503, "BFF_NOT_CONFIGURED", "Invalid body limit", id);
    }
    if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
      return json(422, "INVALID_REQUEST", "JSON body required", id);
    }
    const declaredLength = request.headers.get("Content-Length");
    if (declaredLength !== null && (!/^\d+$/u.test(declaredLength) || Number(declaredLength) > max)) {
      return json(413, "PAYLOAD_TOO_LARGE", "Request body exceeds configured limit", id);
    }
    try {
      const limited = await readLimitedBody(request, max);
      if (limited === null) return json(413, "PAYLOAD_TOO_LARGE", "Request body exceeds configured limit", id);
      body = limited;
    } catch {
      return json(400, "INVALID_REQUEST", "Could not read request body", id);
    }
  }
  const upstream = new URL(upstreamPath(context), env.ANALYSIS_BACKEND_URL);
  const headers = new Headers(request.headers);
  headers.delete("Cookie");
  headers.delete("Host");
  headers.delete("Content-Length");
  headers.delete("Transfer-Encoding");
  headers.delete("X-Tenant-ID");
  headers.delete("X-Forwarded-For");
  headers.delete("X-Forwarded-Host");
  headers.delete("X-Forwarded-Proto");
  headers.set("X-Trace-ID", id);
  try {
    const response = await fetch(upstream, { method: request.method, headers, body, signal: AbortSignal.timeout(10_000) });
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Cache-Control", "no-store");
    responseHeaders.set("X-Trace-ID", id);
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return json(502, "UPSTREAM_UNAVAILABLE", "Backend is temporarily unavailable", id);
  }
};
