import { json, withErrorHandling } from "@/lib/http/cors";
import { getCustomerId } from "@/lib/http/request";
import { wishlistService } from "@/lib/services";

interface Params {
  params: Promise<{ productId: string }>;
}

export const DELETE = withErrorHandling(async (request: Request, { params }: Params) => {
  const customerId = getCustomerId(request);
  const { productId } = await params;
  return json(await wishlistService.remove(customerId, productId));
});

export async function OPTIONS() {
  return json(null, 204);
}
