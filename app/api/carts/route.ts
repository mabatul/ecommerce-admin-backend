import { json } from "@/lib/http/cors";
import { withAdmin } from "@/lib/http/auth";
import { cartsRepository } from "@/lib/repositories/carts";

// Admin overview of every cart; app/api/carts/[userId] is one at a time.
export const GET = withAdmin(async (_request: Request) => json(await cartsRepository.list()));

export async function OPTIONS() {
  return json(null, 204);
}
