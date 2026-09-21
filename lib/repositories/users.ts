import { GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, scanAll } from "../aws/dynamodb";
import { tableName } from "../aws/config";
import type { User } from "../types";

export type { User } from "../types";

const TABLE = tableName("Users");

export const usersRepository = {
  list(): Promise<User[]> {
    return scanAll<User>({ TableName: TABLE });
  },

  async get(userId: string): Promise<User | undefined> {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { userId } }));
    return result.Item as User | undefined;
  },

  async put(user: User): Promise<User> {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: user }));
    return user;
  },

  async remove(userId: string): Promise<void> {
    await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { userId } }));
  },
};
