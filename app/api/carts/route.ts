import { json, withErrorHandling } from "@/lib/http/cors";
import { cartsRepository } from "@/lib/repositories/carts";

// Admin overview of every cart; app/api/carts/[userId] is one at a time.
export const GET = withErrorHandling(async () => {
  const carts = await cartsRepository.list();
  return json(carts);
});

export async function OPTIONS() {
  return json(null, 204);
}
