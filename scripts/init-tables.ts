/**
 * Creates the DynamoDB tables when the backend points at a custom endpoint (DynamoDB Local on
 * Railway, LocalStack). Idempotent: existing tables are left alone. Mirrors the keys and the
 * ByCategory index in ecommerce-admin-infra/infrastructure/cloudformation/main.yaml.
 *
 * Runs as Railway's pre-deploy command, i.e. inside the private network, so the database never
 * has to be reachable from the internet. Against real AWS (no AWS_ENDPOINT_URL) CloudFormation
 * owns the tables and this does nothing.
 */
import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceInUseException,
  type CreateTableCommandInput,
} from "@aws-sdk/client-dynamodb";
import { endpoint, environment, isLocalStack, region, resolveCredentials, tableName } from "../lib/aws/config";

type Entity = Parameters<typeof tableName>[0];

const keyOnly = (key: string): Omit<CreateTableCommandInput, "TableName"> => ({
  BillingMode: "PAY_PER_REQUEST",
  AttributeDefinitions: [{ AttributeName: key, AttributeType: "S" }],
  KeySchema: [{ AttributeName: key, KeyType: "HASH" }],
});

const definitions: Record<Entity, Omit<CreateTableCommandInput, "TableName">> = {
  Users: keyOnly("userId"),
  Categories: keyOnly("categoryId"),
  Carts: keyOnly("userId"),
  Wishlists: keyOnly("userId"),
  Products: {
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "productId", AttributeType: "S" },
      { AttributeName: "categoryId", AttributeType: "S" },
    ],
    KeySchema: [{ AttributeName: "productId", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "ByCategory",
        KeySchema: [{ AttributeName: "categoryId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  },
};

async function main() {
  if (!isLocalStack) {
    console.log("[init-tables] no AWS_ENDPOINT_URL: tables are managed by CloudFormation, nothing to do.");
    return;
  }

  const client = new DynamoDBClient({ region, endpoint, credentials: resolveCredentials() });
  console.log(`[init-tables] ${environment} @ ${endpoint}`);

  for (const entity of Object.keys(definitions) as Entity[]) {
    const TableName = tableName(entity);
    try {
      await client.send(new CreateTableCommand({ TableName, ...definitions[entity] }));
      console.log(`  created  ${TableName}`);
    } catch (error) {
      if (!(error instanceof ResourceInUseException)) throw error;
      console.log(`  exists   ${TableName}`);
    }
    await client.send(new DescribeTableCommand({ TableName })); // fails loudly if it isn't there
  }
}

main().catch((error) => {
  console.error("[init-tables] failed:", error);
  process.exit(1);
});
