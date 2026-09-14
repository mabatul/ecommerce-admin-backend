import { NextRequest } from "next/server";
import { json, withErrorHandling } from "@/lib/http/cors";
import { cartsRepository } from "@/lib/repositories/carts";

// Next.js 15+: params arrives as a Promise in dynamic route handlers.
interface Params {
  params: Promise<{ userId: string }>;
}

export const GET = withErrorHandling(async (_request: Request, { params }: Params) => {
  const { userId } = await params;
  const cart = await cartsRepository.get(userId);
  return json(cart ?? { userId, items: [], updatedAt: null });
});

export const PUT = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const { userId } = await params;
  const body = await request.json();

  const cart = await cartsRepository.put({
    userId,
    items: Array.isArray(body.items) ? body.items : [],
    updatedAt: new Date().toISOString(),
  });

  return json(cart);
});

export const DELETE = withErrorHandling(async (_request: Request, { params }: Params) => {
  const { userId } = await params;
  await cartsRepository.remove(userId);
  return json(null, 204);
});

// Was missing entirely before — without it, Next.js answers a CORS
// preflight OPTIONS itself, with no Access-Control-Allow-Origin header,
// so a cross-origin PUT/DELETE here (e.g. "Clear cart" in the frontend)
// would fail as a CORS error before ever reaching PUT/DELETE above.
// Verified live alongside the same bug in wishlists/[userId].
export async function OPTIONS() {
  return json(null, 204);
}
