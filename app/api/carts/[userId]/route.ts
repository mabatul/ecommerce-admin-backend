import { json } from "@/lib/http/cors";
import { withAdmin } from "@/lib/http/auth";
import { readJson } from "@/lib/http/request";
import { parse, adminCartSchema } from "@/lib/validators";
import { cartsRepository } from "@/lib/repositories/carts";
import { cartService } from "@/lib/services";

interface Params {
  params: Promise<{ userId: string }>;
}

export const GET = withAdmin(async (_request: Request, { params }: Params) => {
  const { userId } = await params;
  const cart = await cartsRepository.get(userId);
  return json(cart ?? { userId, items: [], updatedAt: null });
});

// Replaces the whole item list (that is how the admin removes a single item).
export const PUT = withAdmin(async (request: Request, { params }: Params) => {
  const { userId } = await params;
  const { items } = parse(adminCartSchema, await readJson(request));
  return json(await cartService.replaceItems(userId, items));
});

export const DELETE = withAdmin(async (_request: Request, { params }: Params) => {
  const { userId } = await params;
  await cartsRepository.remove(userId);
  return json(null, 204);
});

export async function OPTIONS() {
  return json(null, 204);
}
