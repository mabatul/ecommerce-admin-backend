// In-memory stand-ins for the repositories, mimicking the DynamoDB behaviours the services rely on.
import type { Cart, Category, Product, User, Wishlist } from "../../types";
import type { RawPage } from "../../repositories/products";

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    productId: "p1",
    name: "Widget",
    price: 10,
    categoryId: "c1",
    stock: 5,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function fakeProducts(initial: Product[] = []) {
  const rows = new Map(initial.map((p) => [p.productId, p]));
  const sorted = () => [...rows.values()].sort((a, b) => a.productId.localeCompare(b.productId));

  // Like DynamoDB: LastEvaluatedKey is set whenever the Limit was hit, even if nothing follows.
  const page = (source: Product[], limit: number, after?: string): RawPage => {
    const start = after ? source.findIndex((p) => p.productId > after) : 0;
    const remaining = start === -1 ? [] : source.slice(start);
    const items = remaining.slice(0, limit);
    return { items, next: items.length === limit ? items[items.length - 1].productId : undefined };
  };

  return {
    rows,
    calls: { scanPage: 0, queryCategoryPage: 0 },
    async list() {
      return sorted();
    },
    async get(productId: string) {
      return rows.get(productId);
    },
    async put(product: Product) {
      rows.set(product.productId, product);
      return product;
    },
    async remove(productId: string) {
      rows.delete(productId);
    },
    async scanPage(args: { limit: number; after?: string }) {
      this.calls.scanPage++;
      return page(sorted(), args.limit, args.after);
    },
    async queryCategoryPage(categoryId: string, args: { limit: number; after?: string }) {
      this.calls.queryCategoryPage++;
      return page(sorted().filter((p) => p.categoryId === categoryId), args.limit, args.after);
    },
    async countByCategory(categoryId: string) {
      return sorted().filter((p) => p.categoryId === categoryId).length;
    },
  };
}

export function fakeCategories(initial: Category[] = []) {
  const rows = new Map(initial.map((c) => [c.categoryId, c]));
  return {
    rows,
    async list() {
      return [...rows.values()];
    },
    async get(categoryId: string) {
      return rows.get(categoryId);
    },
    async put(category: Category) {
      rows.set(category.categoryId, category);
      return category;
    },
    async remove(categoryId: string) {
      rows.delete(categoryId);
    },
  };
}

export function fakeUsers(initial: User[] = []) {
  const rows = new Map(initial.map((u) => [u.userId, u]));
  return {
    rows,
    async list() {
      return [...rows.values()];
    },
    async get(userId: string) {
      return rows.get(userId);
    },
    async put(user: User) {
      rows.set(user.userId, user);
      return user;
    },
    async remove(userId: string) {
      rows.delete(userId);
    },
  };
}

function conditionalFailure() {
  const error = new Error("The conditional request failed");
  error.name = "ConditionalCheckFailedException";
  return error;
}

// Enforces the same condition as the real repositories' save(): new-only, or version must match.
function versionedStore<T extends { userId: string; version?: number }>(initial: T[] = []) {
  const rows = new Map(initial.map((r) => [r.userId, r]));
  return {
    rows,
    saves: 0,
    // Test hook: runs before each save, e.g. to simulate another request winning the race.
    beforeSave: undefined as undefined | (() => void),
    async get(userId: string) {
      return rows.get(userId);
    },
    async list() {
      return [...rows.values()];
    },
    async save(row: T, expectedVersion: number | null) {
      this.beforeSave?.();
      const existing = rows.get(row.userId);
      if (expectedVersion === null) {
        if (existing) throw conditionalFailure();
      } else if (!existing || (existing.version !== undefined && existing.version !== expectedVersion)) {
        throw conditionalFailure();
      }
      this.saves++;
      rows.set(row.userId, row);
    },
    async remove(userId: string) {
      rows.delete(userId);
    },
  };
}

export const fakeCarts = (initial: Cart[] = []) => versionedStore<Cart>(initial);
export const fakeWishlists = (initial: Wishlist[] = []) => versionedStore<Wishlist>(initial);
