import { NextResponse } from "next/server";

/**
 * Local-dev-friendly CORS. The frontend and backend run as separate
 * containers/ports, so browser requests are cross-origin even locally.
 */
export function withCors(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export function json(data: unknown, init?: number | ResponseInit): NextResponse {
  const resolvedInit = typeof init === "number" ? { status: init } : init;
  const status = resolvedInit?.status ?? 200;

  // 204/205/304 responses are defined as never having a body — the fetch
  // spec throws ("Response with null body status cannot have body") if you
  // try anyway, which NextResponse.json(null, { status: 204 }) does (it
  // still serializes `null` to the 4-byte string "null"). Every DELETE and
  // every CORS preflight OPTIONS in this app returns exactly that shape,
  // so without this special case they all 500 — verified live: the
  // response blows up before withCors ever runs, so the browser sees a
  // missing Access-Control-Allow-Origin header and reports it as a CORS
  // failure instead of the real 500.
  if (status === 204 || status === 205 || status === 304) {
    return withCors(new NextResponse(null, resolvedInit));
  }

  const response = NextResponse.json(data, resolvedInit);
  return withCors(response);
}

/**
 * Wraps a route handler so that ANY thrown error still comes back through
 * json()/withCors() instead of Next.js's own bare error response (no CORS
 * headers at all). Without this, an uncaught exception anywhere in a
 * handler — a bad DynamoDB write, a malformed request body, anything —
 * shows up in the browser as a CORS failure ("No Access-Control-Allow-
 * Origin header") instead of the real error, which is exactly what
 * happened twice already (the 204-with-a-body bug, then the
 * empty-string-id bug) before every handler was wrapped with this.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("[api] unhandled error:", error);
      return json({ error: "Internal server error" }, 500);
    }
  };
}
