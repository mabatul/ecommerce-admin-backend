import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { json } from "@/lib/http/cors";
import { productsRepository } from "@/lib/repositories/products";

export async function GET() {
  const products = await productsRepository.list();
  return json(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name || typeof body.price !== "number" || !body.categoryId) {
    return json({ error: "name, price and categoryId are required" }, 400);
  }

  const product = await productsRepository.put({
    // `||`, not `??`: an empty string (the frontend sends one for a new
    // product, having nothing to put there yet) must also fall through to
    // a generated id — DynamoDB rejects an empty string as a key value and
    // crashes the whole request with a 500 that never reaches the CORS
    // headers, which is what the browser actually reported. Verified live.
    productId: body.productId || randomUUID(),
    name: body.name,
    description: body.description,
    price: body.price,
    categoryId: body.categoryId,
    stock: body.stock ?? 0,
    createdAt: new Date().toISOString(),
  });

  return json(product, 201);
}

export async function OPTIONS() {
  return json(null, 204);
}
