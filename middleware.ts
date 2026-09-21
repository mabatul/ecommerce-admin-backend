import { NextResponse, type NextRequest } from "next/server";
import { withCors } from "@/lib/http/cors";

// Answer every CORS preflight here so no route can forget its own OPTIONS handler
// (a route without one fails the preflight, which the browser reports as a CORS error).
export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCors(new NextResponse(null, { status: 204 }));
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
