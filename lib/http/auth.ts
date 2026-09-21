import { createHash, timingSafeEqual } from "crypto";
import type { NextResponse } from "next/server";
import { AppError, UnauthorizedError } from "../errors";
import { environment } from "../aws/config";
import { withErrorHandling } from "./cors";

// Compare digests so neither the content nor the length of the key leaks via timing.
function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

// Admin routes need `Authorization: Bearer <ADMIN_API_KEY>`. Without a configured
// key they're only open in `local`; anywhere else they refuse to run.
export function requireAdmin(request: Request): void {
  const key = process.env.ADMIN_API_KEY?.trim();

  if (!key) {
    if (environment === "local") return;
    throw new AppError(503, "Admin API is not configured");
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!safeEqual(token, key)) throw new UnauthorizedError("Invalid or missing admin key");
}

export function withAdmin<Args extends [Request, ...unknown[]]>(
  handler: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return withErrorHandling(async (...args: Args) => {
    requireAdmin(args[0]);
    return handler(...args);
  });
}
