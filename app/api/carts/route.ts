import { json, withErrorHandling } from "@/lib/http/cors";
import { cartsRepository } from "@/lib/repositories/carts";

// Admin overview across every user's cart — the per-user route
// (app/api/carts/[userId]) is for reading/editing one at a time.
export const GET = withErrorHandling(async () => {
  const carts = await cartsRepository.list();
  return json(carts);
});

export async function OPTIONS() {
  return json(null, 204);
}
