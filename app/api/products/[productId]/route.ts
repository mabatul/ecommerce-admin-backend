import { NextRequest } from "next/server";
import { json, withErrorHandling } from "@/lib/http/cors";
import { productsRepository } from "@/lib/repositories/products";

// Next.js 15+: params arrives as a Promise in dynamic route handlers.
interface Params {
  params: Promise<{ productId: string }>;
}

export const GET = withErrorHandling(async (_request: Request, { params }: Params) => {
  const { productId } = await params;
  const product = await productsRepository.get(productId);
  if (!product) return json({ error: "not found" }, 404);
  return json(product);
});

// Full edit and "update stock" both go through this — a stock-only update
// is just a PUT with the other fields unchanged (the frontend sends the
// full product either way, since that's what it already has loaded).
export const PUT = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const { productId } = await params;
  const body = await request.json();

  if (!body.name || typeof body.price !== "number" || !body.categoryId) {
    return json({ error: "name, price and categoryId are required" }, 400);
  }

  const existing = await productsRepository.get(productId);
  if (!existing) return json({ error: "not found" }, 404);

  const product = await productsRepository.put({
    productId,
    name: body.name,
    description: body.description,
    price: body.price,
    categoryId: body.categoryId,
    stock: typeof body.stock === "number" ? body.stock : existing.stock,
    createdAt: existing.createdAt,
  });

  return json(product);
});

export const DELETE = withErrorHandling(async (_request: Request, { params }: Params) => {
  const { productId } = await params;
  await productsRepository.remove(productId);
  return json(null, 204);
});

export async function OPTIONS() {
  return json(null, 204);
}
