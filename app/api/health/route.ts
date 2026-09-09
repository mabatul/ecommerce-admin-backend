import { json } from "@/lib/http/cors";
import { environment, isLocalStack, region } from "@/lib/aws/config";

export async function GET() {
  return json({
    status: "ok",
    environment,
    region,
    backedBy: isLocalStack ? "localstack" : "aws",
    timestamp: new Date().toISOString(),
  });
}
