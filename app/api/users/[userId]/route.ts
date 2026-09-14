import { NextRequest } from "next/server";
import { json, withErrorHandling } from "@/lib/http/cors";
import { usersRepository } from "@/lib/repositories/users";

// Next.js 15+: params arrives as a Promise in dynamic route handlers.
interface Params {
  params: Promise<{ userId: string }>;
}

export const GET = withErrorHandling(async (_request: Request, { params }: Params) => {
  const { userId } = await params;
  const user = await usersRepository.get(userId);
  if (!user) return json({ error: "not found" }, 404);
  return json(user);
});

export const PUT = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const { userId } = await params;
  const body = await request.json();

  if (!body.name || !body.email) {
    return json({ error: "name and email are required" }, 400);
  }

  const existing = await usersRepository.get(userId);
  if (!existing) return json({ error: "not found" }, 404);

  const user = await usersRepository.put({
    userId,
    name: body.name,
    email: body.email,
    role: body.role === "admin" ? "admin" : "customer",
    createdAt: existing.createdAt,
  });

  return json(user);
});

export const DELETE = withErrorHandling(async (_request: Request, { params }: Params) => {
  const { userId } = await params;
  await usersRepository.remove(userId);
  return json(null, 204);
});

export async function OPTIONS() {
  return json(null, 204);
}
