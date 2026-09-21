import { json, withErrorHandling } from "@/lib/http/cors";
import { getCustomerId } from "@/lib/http/request";
import { cartService } from "@/lib/services";

export const GET = withErrorHandling(async (request: Request) => {
  return json(await cartService.view(getCustomerId(request)));
});

// Empties the cart.
export const DELETE = withErrorHandling(async (request: Request) => {
  return json(await cartService.clear(getCustomerId(request)));
});

export async function OPTIONS() {
  return json(null, 204);
}
