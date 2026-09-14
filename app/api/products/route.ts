import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { json, withErrorHandling } from "@/lib/http/cors";
import { productsRepository } from "@/lib/repositories/products";

export const GET = withErrorHandling(async () => {
  const products = await productsRepository.list();
  return json(products);
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.name || typeof body.price !== "number" || !body.categoryId) {
    return json({ error: "name, price and categoryId are required" }, 400);
  }

  // `||` not `??`: an empty string (new-product forms) must also generate an id.
  const product = await productsRepository.put({
    productId: body.productId || randomUUID(),
    name: body.name,
    description: body.description,
    price: body.price,
    categoryId: body.categoryId,
    stock: body.stock ?? 0,
    createdAt: new Date().toISOString(),
  });

  return json(product, 201);
});

export async function OPTIONS() {
  return json(null, 204);
}
