import { GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, scanAll } from "../aws/dynamodb";
import { tableName } from "../aws/config";
import type { Wishlist } from "../types";

export type { Wishlist } from "../types";

const TABLE = tableName("Wishlists");

export const wishlistsRepository = {
  list(): Promise<Wishlist[]> {
    return scanAll<Wishlist>({ TableName: TABLE });
  },

  async get(userId: string): Promise<Wishlist | undefined> {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { userId } }));
    return result.Item as Wishlist | undefined;
  },

  // Unconditional write (seed data).
  async put(wishlist: Wishlist): Promise<Wishlist> {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: wishlist }));
    return wishlist;
  },

  // Same optimistic contract as cartsRepository.save.
  async save(wishlist: Wishlist, expectedVersion: number | null): Promise<void> {
    const condition =
      expectedVersion === null
        ? { ConditionExpression: "attribute_not_exists(userId)" }
        : {
            ConditionExpression: "attribute_exists(userId) AND (attribute_not_exists(#version) OR #version = :expected)",
            ExpressionAttributeNames: { "#version": "version" },
            ExpressionAttributeValues: { ":expected": expectedVersion },
          };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: wishlist, ...condition }));
  },

  async remove(userId: string): Promise<void> {
    await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { userId } }));
  },
};
