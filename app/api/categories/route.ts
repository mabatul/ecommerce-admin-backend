import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { json, withErrorHandling } from "@/lib/http/cors";
import { categoriesRepository } from "@/lib/repositories/categories";

export const GET = withErrorHandling(async () => {
  const categories = await categoriesRepository.list();
  return json(categories);
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.name) {
    return json({ error: "name is required" }, 400);
  }

  const category = await categoriesRepository.put({
    categoryId: body.categoryId || randomUUID(),
    name: body.name,
    description: body.description,
  });

  return json(category, 201);
});

export async function OPTIONS() {
  return json(null, 204);
}
