import { json } from "@/lib/http/cors";
import { withAdmin } from "@/lib/http/auth";
import { readJson } from "@/lib/http/request";
import { parse, productSchema } from "@/lib/validators";
import { productService } from "@/lib/services";

interface Params {
  params: Promise<{ productId: string }>;
}

export const GET = withAdmin(async (_request: Request, { params }: Params) => {
  const { productId } = await params;
  return json(await productService.get(productId));
});

// Also covers "update stock" — same PUT, just a changed stock value.
export const PUT = withAdmin(async (request: Request, { params }: Params) => {
  const { productId } = await params;
  const input = parse(productSchema, await readJson(request));
  return json(await productService.update(productId, input));
});

export const DELETE = withAdmin(async (_request: Request, { params }: Params) => {
  const { productId } = await params;
  await productService.remove(productId);
  return json(null, 204);
});

export async function OPTIONS() {
  return json(null, 204);
}
