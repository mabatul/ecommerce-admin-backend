import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { json, withErrorHandling } from "@/lib/http/cors";
import { usersRepository } from "@/lib/repositories/users";

export const GET = withErrorHandling(async () => {
  const users = await usersRepository.list();
  return json(users);
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.name || !body.email) {
    return json({ error: "name and email are required" }, 400);
  }

  const user = await usersRepository.put({
    userId: body.userId || randomUUID(),
    name: body.name,
    email: body.email,
    role: body.role === "admin" ? "admin" : "customer",
    createdAt: new Date().toISOString(),
  });

  return json(user, 201);
});

export async function OPTIONS() {
  return json(null, 204);
}
