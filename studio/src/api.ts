export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryAfter?: string,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined
        ? {}
        : { "content-type": "application/json", "x-sassycam-request": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
    cache: "no-store",
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new APIError(
      "Le service a renvoyé une réponse illisible.",
      "invalid_response",
    );
  }
  if (!response.ok || data.error)
    throw new APIError(
      data.error?.message || "Le service est indisponible.",
      data.error?.code || "request_failed",
      data.error?.retryAfter,
    );
  return data;
}
