import { GetCommand, PutCommand, ScanCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, scanAll } from "../aws/dynamodb";
import { tableName } from "../aws/config";
import type { Product } from "../types";

export type { Product } from "../types";

const TABLE = tableName("Products");
const CATEGORY_INDEX = "ByCategory";

// `next` is the productId to resume after; undefined once the source is exhausted.
export interface RawPage {
  items: Product[];
  next?: string;
}

export const productsRepository = {
  list(): Promise<Product[]> {
    return scanAll<Product>({ TableName: TABLE });
  },

  async get(productId: string): Promise<Product | undefined> {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { productId } }));
    return result.Item as Product | undefined;
  },

  async put(product: Product): Promise<Product> {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: product }));
    return product;
  },

  async remove(productId: string): Promise<void> {
    await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { productId } }));
  },

  async scanPage({ limit, after }: { limit: number; after?: string }): Promise<RawPage> {
    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE,
        Limit: limit,
        ExclusiveStartKey: after ? { productId: after } : undefined,
      })
    );
    return {
      items: (result.Items ?? []) as Product[],
      next: result.LastEvaluatedKey?.productId as string | undefined,
    };
  },

  async queryCategoryPage(categoryId: string, { limit, after }: { limit: number; after?: string }): Promise<RawPage> {
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: CATEGORY_INDEX,
        KeyConditionExpression: "categoryId = :categoryId",
        ExpressionAttributeValues: { ":categoryId": categoryId },
        Limit: limit,
        ExclusiveStartKey: after ? { productId: after, categoryId } : undefined,
      })
    );
    return {
      items: (result.Items ?? []) as Product[],
      next: result.LastEvaluatedKey?.productId as string | undefined,
    };
  },

  async countByCategory(categoryId: string): Promise<number> {
    let count = 0;
    let startKey: Record<string, unknown> | undefined;

    do {
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: CATEGORY_INDEX,
          KeyConditionExpression: "categoryId = :categoryId",
          ExpressionAttributeValues: { ":categoryId": categoryId },
          Select: "COUNT",
          ExclusiveStartKey: startKey,
        })
      );
      count += result.Count ?? 0;
      startKey = result.LastEvaluatedKey;
    } while (startKey);

    return count;
  },
};
