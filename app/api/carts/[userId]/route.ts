import { NextRequest } from "next/server";
import { json } from "@/lib/http/cors";
import { cartsRepository } from "@/lib/repositories/carts";

// Next.js 15+: params arrives as a Promise in dynamic route handlers.
interface Params {
  params: Promise<{ userId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { userId } = await params;
  const cart = await cartsRepository.get(userId);
  return json(cart ?? { userId, items: [], updatedAt: null });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { userId } = await params;
  const body = await request.json();

  const cart = await cartsRepository.put({
    userId,
    items: Array.isArray(body.items) ? body.items : [],
    updatedAt: new Date().toISOString(),
  });

  return json(cart);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { userId } = await params;
  await cartsRepository.remove(userId);
  return json(null, 204);
}
