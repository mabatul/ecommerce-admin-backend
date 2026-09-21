import { GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, scanAll } from "../aws/dynamodb";
import { tableName } from "../aws/config";
import type { Cart } from "../types";

export type { Cart, CartItem } from "../types";

const TABLE = tableName("Carts");

export const cartsRepository = {
  list(): Promise<Cart[]> {
    return scanAll<Cart>({ TableName: TABLE });
  },

  async get(userId: string): Promise<Cart | undefined> {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { userId } }));
    return result.Item as Cart | undefined;
  },

  // Unconditional write (seed data).
  async put(cart: Cart): Promise<Cart> {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: cart }));
    return cart;
  },

  // Optimistic write: null = the cart must not exist yet; a number = the version we read
  // (0 = written before versioning existed). Throws ConditionalCheckFailedException otherwise.
  async save(cart: Cart, expectedVersion: number | null): Promise<void> {
    const condition =
      expectedVersion === null
        ? { ConditionExpression: "attribute_not_exists(userId)" }
        : {
            ConditionExpression: "attribute_exists(userId) AND (attribute_not_exists(#version) OR #version = :expected)",
            ExpressionAttributeNames: { "#version": "version" },
            ExpressionAttributeValues: { ":expected": expectedVersion },
          };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: cart, ...condition }));
  },

  async remove(userId: string): Promise<void> {
    await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { userId } }));
  },
};
