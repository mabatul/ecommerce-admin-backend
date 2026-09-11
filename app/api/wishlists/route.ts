import { json } from "@/lib/http/cors";
import { wishlistsRepository } from "@/lib/repositories/wishlists";

// Admin overview across every user's wishlist — the per-user route
// (app/api/wishlists/[userId]) is for reading/editing one at a time.
export async function GET() {
  const wishlists = await wishlistsRepository.list();
  return json(wishlists);
}

export async function OPTIONS() {
  return json(null, 204);
}
