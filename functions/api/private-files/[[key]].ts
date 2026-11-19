interface PrivateFileObject {
  body: ReadableStream;
  httpEtag?: string;
  httpMetadata?: { contentType?: string };
}

interface PrivateFilesBucket {
  get(key: string): Promise<PrivateFileObject | null>;
}

interface Env {
  PRIVATE_FILES: PrivateFilesBucket;
  PRIVATE_FILE_ACCESS_TOKEN?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
  params: Record<string, string | undefined>;
}

function unauthorized(): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "Cache-Control": "no-store" },
  });
}

function safeKey(rawKey: string | undefined): string | null {
  if (!rawKey) return null;
  let key: string;
  try {
    key = decodeURIComponent(rawKey);
  } catch {
    return null;
  }
  if (
    key.length === 0 ||
    key.length > 1024 ||
    key.startsWith("/") ||
    key.includes("..") ||
    /[\u0000-\u001f\u007f]/u.test(key)
  ) {
    return null;
  }
  return key;
}

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const configuredToken = context.env.PRIVATE_FILE_ACCESS_TOKEN;
  const authorization = context.request.headers.get("authorization");
  if (!configuredToken || authorization !== `Bearer ${configuredToken}`) {
    return unauthorized();
  }

  const key = safeKey(context.params.key);
  if (!key) {
    return new Response("Not found", { status: 404 });
  }

  const object = await context.env.PRIVATE_FILES.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
  if (object.httpEtag) headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
};
