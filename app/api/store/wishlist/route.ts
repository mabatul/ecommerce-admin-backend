import { json, withErrorHandling } from "@/lib/http/cors";
import { getCustomerId } from "@/lib/http/request";
import { wishlistService } from "@/lib/services";

export const GET = withErrorHandling(async (request: Request) => {
  return json(await wishlistService.view(getCustomerId(request)));
});

export const DELETE = withErrorHandling(async (request: Request) => {
  return json(await wishlistService.clear(getCustomerId(request)));
});

export async function OPTIONS() {
  return json(null, 204);
}
