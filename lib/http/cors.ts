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
  const response = NextResponse.json(data, typeof init === "number" ? { status: init } : init);
  return withCors(response);
}
