import { json } from "@/lib/http/cors";
import { withAdmin } from "@/lib/http/auth";
import { statsService } from "@/lib/services";

export const GET = withAdmin(async (_request: Request) => json(await statsService.dashboard()));

export async function OPTIONS() {
  return json(null, 204);
}
