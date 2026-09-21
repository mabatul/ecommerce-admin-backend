import { json, withErrorHandling } from "@/lib/http/cors";
import { getCustomerId, readJson } from "@/lib/http/request";
import { parse, setQuantitySchema } from "@/lib/validators";
import { cartService } from "@/lib/services";

interface Params {
  params: Promise<{ productId: string }>;
}

// Sets the quantity of a line that is already in the cart.
export const PATCH = withErrorHandling(async (request: Request, { params }: Params) => {
  const customerId = getCustomerId(request);
  const { productId } = await params;
  const { quantity } = parse(setQuantitySchema, await readJson(request));
  return json(await cartService.setQuantity(customerId, productId, quantity));
});

export const DELETE = withErrorHandling(async (request: Request, { params }: Params) => {
  const customerId = getCustomerId(request);
  const { productId } = await params;
  return json(await cartService.remove(customerId, productId));
});

export async function OPTIONS() {
  return json(null, 204);
}
