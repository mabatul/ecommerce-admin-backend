import { json, withErrorHandling } from "@/lib/http/cors";
import { getCustomerId, readJson } from "@/lib/http/request";
import { addToCartSchema, parse } from "@/lib/validators";
import { cartService } from "@/lib/services";

// Adding a product already in the cart increases its quantity (no duplicate line).
export const POST = withErrorHandling(async (request: Request) => {
  const customerId = getCustomerId(request);
  const input = parse(addToCartSchema, await readJson(request));
  return json(await cartService.add(customerId, input), 201);
});

export async function OPTIONS() {
  return json(null, 204);
}
