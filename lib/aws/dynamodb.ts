import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, type ScanCommandInput } from "@aws-sdk/lib-dynamodb";
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

// A single Scan returns at most 1 MB; follow LastEvaluatedKey to get every item.
export async function scanAll<T>(params: ScanCommandInput): Promise<T[]> {
  const items: T[] = [];
  let startKey: ScanCommandInput["ExclusiveStartKey"];

  do {
    const result = await ddb.send(new ScanCommand({ ...params, ExclusiveStartKey: startKey }));
    items.push(...((result.Items ?? []) as T[]));
    startKey = result.LastEvaluatedKey;
  } while (startKey);

  return items;
}
