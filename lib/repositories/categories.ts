import { GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, scanAll } from "../aws/dynamodb";
import { tableName } from "../aws/config";
import type { Category } from "../types";

export type { Category } from "../types";

const TABLE = tableName("Categories");

export const categoriesRepository = {
  list(): Promise<Category[]> {
    return scanAll<Category>({ TableName: TABLE });
  },

  async get(categoryId: string): Promise<Category | undefined> {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { categoryId } }));
    return result.Item as Category | undefined;
  },

  async put(category: Category): Promise<Category> {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: category }));
    return category;
  },

  async remove(categoryId: string): Promise<void> {
    await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { categoryId } }));
  },
};
