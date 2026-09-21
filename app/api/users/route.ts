import { json } from "@/lib/http/cors";
import { withAdmin } from "@/lib/http/auth";
import { readJson } from "@/lib/http/request";
import { parse, userSchema } from "@/lib/validators";
import { userService } from "@/lib/services";

export const GET = withAdmin(async (_request: Request) => json(await userService.list()));

export const POST = withAdmin(async (request: Request) => {
  const input = parse(userSchema, await readJson(request));
  return json(await userService.create(input), 201);
});

export async function OPTIONS() {
  return json(null, 204);
}
