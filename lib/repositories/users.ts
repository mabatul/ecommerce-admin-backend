import { GetCommand, PutCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../aws/dynamodb";
import { tableName } from "../aws/config";

export interface User {
  userId: string;
  name: string;
  email: string;
  role: "admin" | "customer";
  createdAt: string;
}

const TABLE = tableName("Users");

export const usersRepository = {
  async list(): Promise<User[]> {
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    return (result.Items ?? []) as User[];
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
