import { json } from "@/lib/http/cors";
import { withAdmin } from "@/lib/http/auth";
import { readJson } from "@/lib/http/request";
import { parse, productSchema } from "@/lib/validators";
import { productService } from "@/lib/services";

export const GET = withAdmin(async (_request: Request) => json(await productService.list()));

export const POST = withAdmin(async (request: Request) => {
  const input = parse(productSchema, await readJson(request));
  return json(await productService.create(input), 201);
});

export async function OPTIONS() {
  return json(null, 204);
}
