import { json, withErrorHandling } from "@/lib/http/cors";
import { wishlistsRepository } from "@/lib/repositories/wishlists";

// Admin overview of every wishlist; app/api/wishlists/[userId] is one at a time.
export const GET = withErrorHandling(async () => {
  const wishlists = await wishlistsRepository.list();
  return json(wishlists);
});

export async function OPTIONS() {
  return json(null, 204);
}
