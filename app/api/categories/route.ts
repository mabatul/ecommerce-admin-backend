import { json } from "@/lib/http/cors";
import { withAdmin } from "@/lib/http/auth";
import { readJson } from "@/lib/http/request";
import { parse, categorySchema } from "@/lib/validators";
import { categoryService } from "@/lib/services";

export const GET = withAdmin(async (_request: Request) => json(await categoryService.list()));

export const POST = withAdmin(async (request: Request) => {
  const input = parse(categorySchema, await readJson(request));
  return json(await categoryService.create(input), 201);
});

export async function OPTIONS() {
  return json(null, 204);
}
