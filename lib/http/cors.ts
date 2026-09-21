import { NextResponse } from "next/server";
import { AppError } from "../errors";

// Frontend, storefront and backend are separate origins.
export function withCors(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Customer-Id");
  return response;
}

export function json(data: unknown, init?: number | ResponseInit): NextResponse {
  const resolvedInit = typeof init === "number" ? { status: init } : init;
  const status = resolvedInit?.status ?? 200;

  // 204/205/304 can't have a body — NextResponse.json(null, ...) throws.
  if (status === 204 || status === 205 || status === 304) {
    return withCors(new NextResponse(null, resolvedInit));
  }

  const response = NextResponse.json(data, resolvedInit);
  return withCors(response);
}

// Every handler goes through this so errors always carry CORS headers (a bare
// Next error response has none and reads as a CORS failure in the browser).
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof AppError) {
        return json({ error: error.message, details: error.details }, error.status);
      }
      console.error("[api] unhandled error:", error);
      return json({ error: "Internal server error" }, 500);
    }
  };
}
