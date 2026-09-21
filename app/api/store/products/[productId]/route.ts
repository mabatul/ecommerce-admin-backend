import { json, withErrorHandling } from "@/lib/http/cors";
import { catalogService } from "@/lib/services";

interface Params {
  params: Promise<{ productId: string }>;
}

export const GET = withErrorHandling(async (_request: Request, { params }: Params) => {
  const { productId } = await params;
  return json(await catalogService.getDetail(productId));
});

export async function OPTIONS() {
  return json(null, 204);
}
