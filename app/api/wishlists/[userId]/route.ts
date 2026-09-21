import { json } from "@/lib/http/cors";
import { withAdmin } from "@/lib/http/auth";
import { readJson } from "@/lib/http/request";
import { parse, adminWishlistSchema } from "@/lib/validators";
import { wishlistsRepository } from "@/lib/repositories/wishlists";
import { wishlistService } from "@/lib/services";

interface Params {
  params: Promise<{ userId: string }>;
}

export const GET = withAdmin(async (_request: Request, { params }: Params) => {
  const { userId } = await params;
  const wishlist = await wishlistsRepository.get(userId);
  return json(wishlist ?? { userId, productIds: [], updatedAt: null });
});

export const PUT = withAdmin(async (request: Request, { params }: Params) => {
  const { userId } = await params;
  const { productIds } = parse(adminWishlistSchema, await readJson(request));
  return json(await wishlistService.replaceProductIds(userId, productIds));
});

export const DELETE = withAdmin(async (_request: Request, { params }: Params) => {
  const { userId } = await params;
  await wishlistsRepository.remove(userId);
  return json(null, 204);
});

export async function OPTIONS() {
  return json(null, 204);
}
