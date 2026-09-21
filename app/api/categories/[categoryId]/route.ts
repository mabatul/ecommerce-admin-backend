import { json } from "@/lib/http/cors";
import { withAdmin } from "@/lib/http/auth";
import { readJson } from "@/lib/http/request";
import { parse, categorySchema } from "@/lib/validators";
import { categoryService } from "@/lib/services";

interface Params {
  params: Promise<{ categoryId: string }>;
}

export const GET = withAdmin(async (_request: Request, { params }: Params) => {
  const { categoryId } = await params;
  return json(await categoryService.get(categoryId));
});

export const PUT = withAdmin(async (request: Request, { params }: Params) => {
  const { categoryId } = await params;
  const input = parse(categorySchema, await readJson(request));
  return json(await categoryService.update(categoryId, input));
});

export const DELETE = withAdmin(async (_request: Request, { params }: Params) => {
  const { categoryId } = await params;
  await categoryService.remove(categoryId);
  return json(null, 204);
});

export async function OPTIONS() {
  return json(null, 204);
}
