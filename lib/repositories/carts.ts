import { GetCommand, PutCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../aws/dynamodb";
import { tableName } from "../aws/config";

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  updatedAt: string;
}

const TABLE = tableName("Carts");

export const cartsRepository = {
  async list(): Promise<Cart[]> {
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    return (result.Items ?? []) as Cart[];
  },

  async get(userId: string): Promise<Cart | undefined> {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { userId } }));
    return result.Item as Cart | undefined;
  },

  async put(cart: Cart): Promise<Cart> {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: cart }));
    return cart;
  },

  async remove(userId: string): Promise<void> {
    await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { userId } }));
  },
};
