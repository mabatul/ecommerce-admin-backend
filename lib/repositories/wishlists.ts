import { GetCommand, PutCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../aws/dynamodb";
import { tableName } from "../aws/config";

export interface Wishlist {
  userId: string;
  productIds: string[];
  updatedAt: string;
}

const TABLE = tableName("Wishlists");

export const wishlistsRepository = {
  async list(): Promise<Wishlist[]> {
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    return (result.Items ?? []) as Wishlist[];
  },

  async get(userId: string): Promise<Wishlist | undefined> {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { userId } }));
    return result.Item as Wishlist | undefined;
  },

  async put(wishlist: Wishlist): Promise<Wishlist> {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: wishlist }));
    return wishlist;
  },

  async remove(userId: string): Promise<void> {
    await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { userId } }));
  },
};
