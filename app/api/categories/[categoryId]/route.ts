import { NextRequest } from "next/server";
import { json } from "@/lib/http/cors";
import { categoriesRepository } from "@/lib/repositories/categories";

// Next.js 15+: params arrives as a Promise in dynamic route handlers.
interface Params {
  params: Promise<{ categoryId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { categoryId } = await params;
  const category = await categoriesRepository.get(categoryId);
  if (!category) return json({ error: "not found" }, 404);
  return json(category);
}

export async function PUT(request: NextRequest, { params }: Params) {
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
}

export async function DELETE(_request: Request, { params }: Params) {
  const { categoryId } = await params;
  await categoriesRepository.remove(categoryId);
  return json(null, 204);
}

export async function OPTIONS() {
  return json(null, 204);
}
