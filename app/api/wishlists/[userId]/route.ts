import { NextRequest } from "next/server";
import { json } from "@/lib/http/cors";
import { wishlistsRepository } from "@/lib/repositories/wishlists";

// Next.js 15+: params arrives as a Promise in dynamic route handlers.
interface Params {
  params: Promise<{ userId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { userId } = await params;
  const wishlist = await wishlistsRepository.get(userId);
  return json(wishlist ?? { userId, productIds: [], updatedAt: null });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { userId } = await params;
  const body = await request.json();

  const wishlist = await wishlistsRepository.put({
    userId,
    productIds: Array.isArray(body.productIds) ? body.productIds : [],
    updatedAt: new Date().toISOString(),
  });

  return json(wishlist);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { userId } = await params;
  await wishlistsRepository.remove(userId);
  return json(null, 204);
}
