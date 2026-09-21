import { randomUUID } from "crypto";
import { ConflictError, NotFoundError } from "../errors";
import type { User } from "../types";
import type { UserInput } from "../validators";

export interface UserDeps {
  users: {
    list(): Promise<User[]>;
    get(userId: string): Promise<User | undefined>;
    put(user: User): Promise<User>;
    remove(userId: string): Promise<void>;
  };
  carts: { remove(userId: string): Promise<void> };
  wishlists: { remove(userId: string): Promise<void> };
}

export function createUserService({ users, carts, wishlists }: UserDeps) {
  return {
    list: () => users.list(),

    async get(userId: string): Promise<User> {
      const user = await users.get(userId);
      if (!user) throw new NotFoundError("User not found");
      return user;
    },

    async create(input: UserInput): Promise<User> {
      if (input.userId && (await users.get(input.userId))) {
        throw new ConflictError(`A user with id "${input.userId}" already exists`);
      }
      return users.put({
        userId: input.userId ?? randomUUID(),
        name: input.name,
        email: input.email,
        role: input.role ?? "customer",
        createdAt: new Date().toISOString(),
      });
    },

    async update(userId: string, input: UserInput): Promise<User> {
      const existing = await users.get(userId);
      if (!existing) throw new NotFoundError("User not found");
      return users.put({
        userId,
        name: input.name,
        email: input.email,
        role: input.role ?? existing.role,
        createdAt: existing.createdAt,
      });
    },

    // A deleted user's cart and wishlist go with them.
    async remove(userId: string): Promise<void> {
      await Promise.all([users.remove(userId), carts.remove(userId), wishlists.remove(userId)]);
    },
  };
}
