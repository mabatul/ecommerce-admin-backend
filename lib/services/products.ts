import { randomUUID } from "crypto";
import { ConflictError, NotFoundError, ValidationError } from "../errors";
import type { Category, Product } from "../types";
import type { ProductInput } from "../validators";

export interface ProductDeps {
  products: {
    list(): Promise<Product[]>;
    get(productId: string): Promise<Product | undefined>;
    put(product: Product): Promise<Product>;
    remove(productId: string): Promise<void>;
  };
  categories: { get(categoryId: string): Promise<Category | undefined> };
}

const money = (value: number) => Math.round(value * 100) / 100;

export function createProductService({ products, categories }: ProductDeps) {
  async function assertCategoryExists(categoryId: string) {
    if (!(await categories.get(categoryId))) {
      throw new ValidationError("categoryId does not match any category");
    }
  }

  return {
    list: () => products.list(),

    async get(productId: string): Promise<Product> {
      const product = await products.get(productId);
      if (!product) throw new NotFoundError("Product not found");
      return product;
    },

    async create(input: ProductInput): Promise<Product> {
      await assertCategoryExists(input.categoryId);
      if (input.productId && (await products.get(input.productId))) {
        throw new ConflictError(`A product with id "${input.productId}" already exists`);
      }

      const now = new Date().toISOString();
      return products.put({
        productId: input.productId ?? randomUUID(),
        name: input.name,
        description: input.description,
        price: money(input.price),
        categoryId: input.categoryId,
        stock: input.stock ?? 0,
        imageUrl: input.imageUrl,
        featured: input.featured ?? false,
        createdAt: now,
        updatedAt: now,
      });
    },

    // Also covers "update stock": same call with a changed stock value.
    async update(productId: string, input: ProductInput): Promise<Product> {
      const existing = await products.get(productId);
      if (!existing) throw new NotFoundError("Product not found");
      await assertCategoryExists(input.categoryId);

      return products.put({
        productId,
        name: input.name,
        description: input.description,
        price: money(input.price),
        categoryId: input.categoryId,
        stock: input.stock ?? existing.stock,
        imageUrl: input.imageUrl,
        featured: input.featured ?? existing.featured ?? false,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      });
    },

    // Idempotent. Carts/wishlists that still reference it show it as unavailable.
    remove: (productId: string) => products.remove(productId),
  };
}
