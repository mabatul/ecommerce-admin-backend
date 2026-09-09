import { GetCommand, PutCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../aws/dynamodb";
import { tableName } from "../aws/config";

export interface Product {
  productId: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  stock: number;
  createdAt: string;
}

const TABLE = tableName("Products");

export const productsRepository = {
  async list(): Promise<Product[]> {
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    return (result.Items ?? []) as Product[];
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
};
