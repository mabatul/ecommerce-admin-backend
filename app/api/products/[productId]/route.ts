import { json } from "@/lib/http/cors";
import { productsRepository } from "@/lib/repositories/products";

// Next.js 15+: params arrives as a Promise in dynamic route handlers.
interface Params {
  params: Promise<{ productId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { productId } = await params;
  const product = await productsRepository.get(productId);
  if (!product) return json({ error: "not found" }, 404);
  return json(product);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { productId } = await params;
  await productsRepository.remove(productId);
  return json(null, 204);
}
