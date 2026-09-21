import { json } from "@/lib/http/cors";
import { withAdmin } from "@/lib/http/auth";
import { readJson } from "@/lib/http/request";
import { parse, userSchema } from "@/lib/validators";
import { userService } from "@/lib/services";

interface Params {
  params: Promise<{ userId: string }>;
}

export const GET = withAdmin(async (_request: Request, { params }: Params) => {
  const { userId } = await params;
  return json(await userService.get(userId));
});

export const PUT = withAdmin(async (request: Request, { params }: Params) => {
  const { userId } = await params;
  const input = parse(userSchema, await readJson(request));
  return json(await userService.update(userId, input));
});

export const DELETE = withAdmin(async (_request: Request, { params }: Params) => {
  const { userId } = await params;
  await userService.remove(userId);
  return json(null, 204);
});

export async function OPTIONS() {
  return json(null, 204);
}
