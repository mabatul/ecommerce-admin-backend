import { json, withErrorHandling } from "@/lib/http/cors";
import { environment, isLocalStack, region } from "@/lib/aws/config";

export const GET = withErrorHandling(async () => {
  return json({
    status: "ok",
    environment,
    region,
    backedBy: isLocalStack ? "localstack" : "aws",
    timestamp: new Date().toISOString(),
  });
});
