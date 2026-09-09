import { GetCommand, PutCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../aws/dynamodb";
import { tableName } from "../aws/config";

export interface Category {
  categoryId: string;
  name: string;
  description?: string;
}

const TABLE = tableName("Categories");

export const categoriesRepository = {
  async list(): Promise<Category[]> {
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    return (result.Items ?? []) as Category[];
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
