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
