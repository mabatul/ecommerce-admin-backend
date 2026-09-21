import { json, withErrorHandling } from "@/lib/http/cors";
import { catalogService } from "@/lib/services";

export const GET = withErrorHandling(async (_request: Request) => json(await catalogService.listCategories()));

export async function OPTIONS() {
  return json(null, 204);
}
