import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { json } from "@/lib/http/cors";
import { categoriesRepository } from "@/lib/repositories/categories";

export async function GET() {
  const categories = await categoriesRepository.list();
  return json(categories);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name) {
    return json({ error: "name is required" }, 400);
  }

  const category = await categoriesRepository.put({
    // `||`, not `??` — see app/api/products/route.ts for why (an empty
    // string, which a "new" form sends, must also fall through to a
    // generated id; DynamoDB rejects "" as a key value).
    categoryId: body.categoryId || randomUUID(),
    name: body.name,
    description: body.description,
  });

  return json(category, 201);
}

export async function OPTIONS() {
  return json(null, 204);
}
