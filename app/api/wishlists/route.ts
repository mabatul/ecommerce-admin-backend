import { json } from "@/lib/http/cors";
import { withAdmin } from "@/lib/http/auth";
import { wishlistsRepository } from "@/lib/repositories/wishlists";

// Admin overview of every wishlist; app/api/wishlists/[userId] is one at a time.
export const GET = withAdmin(async (_request: Request) => json(await wishlistsRepository.list()));

export async function OPTIONS() {
  return json(null, 204);
}
