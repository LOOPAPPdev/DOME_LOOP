export type ApiErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "CONFLICT" | "INVALID_REQUEST" | "RATE_LIMITED" | "UPSTREAM_UNAVAILABLE" | "UNKNOWN"

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly traceId?: string
  constructor(status: number, code: ApiErrorCode, message: string, traceId?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.traceId = traceId
  }
}

export interface ApiClientOptions {
  csrfToken?: string
  fetcher?: typeof fetch
}

function errorCode(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHENTICATED"
  if (status === 403) return "FORBIDDEN"
  if (status === 409 || status === 412) return "CONFLICT"
  if (status === 422) return "INVALID_REQUEST"
  if (status === 429) return "RATE_LIMITED"
  if (status >= 500) return "UPSTREAM_UNAVAILABLE"
  return "UNKNOWN"
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, options: ApiClientOptions = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase()
  const headers = new Headers(init.headers)
  headers.set("Accept", "application/json")
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  if (options.csrfToken && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) headers.set("X-CSRF-Token", options.csrfToken)
  const response = await (options.fetcher ?? fetch)(`/api/v1/${path.replace(/^\//u, "")}`, { ...init, headers, credentials: "same-origin" })
  if (!response.ok) {
    let body: { error?: { code?: string; message?: string; trace_id?: string } } = {}
    try { body = await response.json() as typeof body } catch { /* preserve status-only errors */ }
    throw new ApiError(response.status, (body.error?.code as ApiErrorCode | undefined) ?? errorCode(response.status), body.error?.message ?? "Request failed", body.error?.trace_id)
  }
  return response.status === 204 ? (undefined as T) : await response.json() as T
}
