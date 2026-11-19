interface Env {
  ANALYSIS_BACKEND_URL?: string
  ANALYSIS_BACKEND_TOKEN?: string
}

interface PagesContext {
  request: Request
  env: Env
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const backendUrl = context.env.ANALYSIS_BACKEND_URL
  const backendToken = context.env.ANALYSIS_BACKEND_TOKEN
  if (!backendUrl || !backendToken) return json({ error: "Analysis service unavailable" }, 503)

  let body: unknown
  try {
    body = await context.request.json()
  } catch {
    return json({ error: "Invalid JSON body" }, 400)
  }
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { question?: unknown }).question !== "string" ||
    !(body as { question: string }).question.trim()
  ) {
    return json({ error: "question is required" }, 400)
  }

  let upstream: Response
  try {
    upstream = await fetch(`${backendUrl.replace(/\/$/u, "")}/analysis/v1`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${backendToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ question: (body as { question: string }).question.trim() }),
    })
  } catch {
    return json({ error: "Analysis service unavailable" }, 502)
  }

  if (!upstream.ok) return json({ error: "Analysis service unavailable" }, 502)
  const response = await upstream.json<unknown>()
  return json(response, 200)
}
