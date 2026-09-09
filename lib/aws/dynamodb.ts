import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { endpoint, region, resolveCredentials } from "./config";

const client = new DynamoDBClient({
  region,
  endpoint,
  credentials: resolveCredentials(),
});

// marshallOptions removes undefined attributes automatically so repository
// code doesn't need to hand-strip optional fields before writing.
export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});
