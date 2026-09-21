import { json, withErrorHandling } from "@/lib/http/cors";
import { getCustomerId, readJson } from "@/lib/http/request";
import { addToWishlistSchema, parse } from "@/lib/validators";
import { wishlistService } from "@/lib/services";

// Adding something already on the wishlist is a no-op, not a duplicate.
export const POST = withErrorHandling(async (request: Request) => {
  const customerId = getCustomerId(request);
  const { productId } = parse(addToWishlistSchema, await readJson(request));
  return json(await wishlistService.add(customerId, productId), 201);
});

export async function OPTIONS() {
  return json(null, 204);
}
