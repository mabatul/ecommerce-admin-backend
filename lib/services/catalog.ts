import { NotFoundError } from "../errors";
import { decodeCursor, encodeCursor } from "../pagination";
import type { Category, Page, Product } from "../types";
import type { ProductSearch } from "../validators";
import type { RawPage } from "../repositories/products";

// Rows read per DynamoDB call when text/price/stock filters may discard most of them.
const FILTERED_BATCH = 100;
// Upper bound on DynamoDB calls per request so a rare search can't scan forever.
const MAX_CALLS = 30;
const RELATED_COUNT = 4;

export interface CatalogDeps {
  products: {
    get(productId: string): Promise<Product | undefined>;
    scanPage(args: { limit: number; after?: string }): Promise<RawPage>;
    queryCategoryPage(categoryId: string, args: { limit: number; after?: string }): Promise<RawPage>;
  };
  categories: {
    list(): Promise<Category[]>;
    get(categoryId: string): Promise<Category | undefined>;
  };
}

function matchesFilters(product: Product, f: ProductSearch): boolean {
  if (f.inStock && product.stock <= 0) return false;
  if (f.featured && !product.featured) return false;
  if (f.minPrice !== undefined && product.price < f.minPrice) return false;
  if (f.maxPrice !== undefined && product.price > f.maxPrice) return false;
  if (f.search) {
    const haystack = `${product.name} ${product.description ?? ""}`.toLowerCase();
    if (!haystack.includes(f.search.toLowerCase())) return false;
  }
  return true;
}

export function createCatalogService({ products, categories }: CatalogDeps) {
  return {
    // Category filter uses the ByCategory index; everything else is filtered while paging.
    async search(filters: ProductSearch): Promise<Page<Product>> {
      const { limit, categoryId } = filters;
      let after = filters.cursor ? decodeCursor(filters.cursor) : undefined;

      const filtered = Boolean(
        filters.search || filters.inStock || filters.featured || filters.minPrice !== undefined || filters.maxPrice !== undefined
      );
      const batch = filtered ? FILTERED_BATCH : limit + 1;
      const matches: Product[] = [];
      let exhausted = false;

      for (let call = 0; call < MAX_CALLS && matches.length <= limit; call++) {
        const page = categoryId
          ? await products.queryCategoryPage(categoryId, { limit: batch, after })
          : await products.scanPage({ limit: batch, after });

        matches.push(...page.items.filter((p) => matchesFilters(p, filters)));

        if (!page.next) {
          exhausted = true;
          break;
        }
        after = page.next;
      }

      if (matches.length > limit) {
        const items = matches.slice(0, limit);
        return { items, hasMore: true, nextCursor: encodeCursor(items[items.length - 1].productId) };
      }
      if (exhausted || !after) return { items: matches, hasMore: false, nextCursor: null };

      // Call budget spent before the end of the data: resume from the last row examined.
      return { items: matches, hasMore: true, nextCursor: encodeCursor(after) };
    },

    async getDetail(productId: string) {
      const product = await products.get(productId);
      if (!product) throw new NotFoundError("Product not found");

      const [category, sameCategory] = await Promise.all([
        categories.get(product.categoryId),
        products.queryCategoryPage(product.categoryId, { limit: RELATED_COUNT + 1 }),
      ]);
      const related = sameCategory.items.filter((p) => p.productId !== productId).slice(0, RELATED_COUNT);

      return { product, category: category ?? null, related };
    },

    async listCategories(): Promise<Category[]> {
      const all = await categories.list();
      return [...all].sort((a, b) => a.name.localeCompare(b.name));
    },
  };
}
