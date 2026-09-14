import { NextRequest } from "next/server";
import { json, withErrorHandling } from "@/lib/http/cors";
import { categoriesRepository } from "@/lib/repositories/categories";

interface Params {
  params: Promise<{ categoryId: string }>;
}

export const GET = withErrorHandling(async (_request: Request, { params }: Params) => {
  const { categoryId } = await params;
  const category = await categoriesRepository.get(categoryId);
  if (!category) return json({ error: "not found" }, 404);
  return json(category);
});

export const PUT = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const { categoryId } = await params;
  const body = await request.json();

  if (!body.name) {
    return json({ error: "name is required" }, 400);
  }

  const existing = await categoriesRepository.get(categoryId);
  if (!existing) return json({ error: "not found" }, 404);

  const category = await categoriesRepository.put({
    categoryId,
    name: body.name,
    description: body.description,
  });

  return json(category);
});

export const DELETE = withErrorHandling(async (_request: Request, { params }: Params) => {
  const { categoryId } = await params;
  await categoriesRepository.remove(categoryId);
  return json(null, 204);
});

export async function OPTIONS() {
  return json(null, 204);
}
