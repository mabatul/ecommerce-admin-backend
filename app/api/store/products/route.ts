import { json, withErrorHandling } from "@/lib/http/cors";
import { parse, productSearchSchema, searchParamsToObject } from "@/lib/validators";
import { catalogService } from "@/lib/services";

// Public catalog: search + filters + cursor pagination.
export const GET = withErrorHandling(async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const filters = parse(productSearchSchema, searchParamsToObject(params));
  return json(await catalogService.search(filters));
});

export async function OPTIONS() {
  return json(null, 204);
}
