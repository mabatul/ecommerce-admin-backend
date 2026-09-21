import { randomUUID } from "crypto";
import { ConflictError, NotFoundError } from "../errors";
import type { Category } from "../types";
import type { CategoryInput } from "../validators";

export interface CategoryDeps {
  categories: {
    list(): Promise<Category[]>;
    get(categoryId: string): Promise<Category | undefined>;
    put(category: Category): Promise<Category>;
    remove(categoryId: string): Promise<void>;
  };
  products: { countByCategory(categoryId: string): Promise<number> };
}

export function createCategoryService({ categories, products }: CategoryDeps) {
  return {
    list: () => categories.list(),

    async get(categoryId: string): Promise<Category> {
      const category = await categories.get(categoryId);
      if (!category) throw new NotFoundError("Category not found");
      return category;
    },

    async create(input: CategoryInput): Promise<Category> {
      if (input.categoryId && (await categories.get(input.categoryId))) {
        throw new ConflictError(`A category with id "${input.categoryId}" already exists`);
      }
      return categories.put({
        categoryId: input.categoryId ?? randomUUID(),
        name: input.name,
        description: input.description,
      });
    },

    async update(categoryId: string, input: CategoryInput): Promise<Category> {
      if (!(await categories.get(categoryId))) throw new NotFoundError("Category not found");
      return categories.put({ categoryId, name: input.name, description: input.description });
    },

    // Refuses while products still point at it, so none end up with a dangling categoryId.
    async remove(categoryId: string): Promise<void> {
      const inUse = await products.countByCategory(categoryId);
      if (inUse > 0) {
        throw new ConflictError(
          `This category still has ${inUse} product${inUse === 1 ? "" : "s"}; move or delete them first`,
          { productCount: inUse }
        );
      }
      await categories.remove(categoryId);
    },
  };
}
