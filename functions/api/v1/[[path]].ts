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

function allowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin");
  const configured = env.LOOP_BFF_ALLOWED_ORIGINS?.split(",").map((item) => item.trim()).filter(Boolean);
  if (!origin || !configured || configured.length === 0) return false;
  return configured.includes(origin);
}

async function validSession(request: Request, secret: string): Promise<boolean> {
  const raw = request.headers.get("Cookie")?.match(/(?:^|;\s*)loop_session=([^;]+)/u)?.[1];
  if (!raw) return false;
  const [payload, encodedSignature] = raw.split(".");
  if (!payload || !encodedSignature) return false;
  const data = new TextEncoder().encode(payload);
  const signature = Uint8Array.from(atob(encodedSignature.replaceAll("-", "+").replaceAll("_", "/")), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", key, signature, data);
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
  if (request.method !== "GET" && request.method !== "HEAD") {
    const max = Number(env.LOOP_BFF_MAX_BODY_BYTES ?? "1048576");
    const length = Number(request.headers.get("Content-Length") ?? "0");
    if (!request.headers.get("Content-Type")?.startsWith("application/json") || length > max) return json(422, "INVALID_REQUEST", "JSON body and size limit required", id);
  }
  const upstream = new URL(`/v1/${pathOf(context)}`, env.ANALYSIS_BACKEND_URL);
  const headers = new Headers(request.headers);
  headers.delete("Cookie");
  headers.delete("Host");
  headers.set("X-Trace-ID", id);
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
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
