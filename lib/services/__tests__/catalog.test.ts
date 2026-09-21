import { describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "../../errors";
import type { ProductSearch } from "../../validators";
import { createCatalogService } from "../catalog";
import { fakeCategories, fakeProducts, makeProduct } from "./fakes";

const id = (n: number) => `p${String(n).padStart(3, "0")}`;

function setup(count = 25, customize: (n: number) => Partial<Parameters<typeof makeProduct>[0]> = () => ({})) {
  const products = fakeProducts(
    Array.from({ length: count }, (_, i) => makeProduct({ productId: id(i + 1), name: `Item ${i + 1}`, ...customize(i + 1) }))
  );
  const categories = fakeCategories([
    { categoryId: "c1", name: "Zeta" },
    { categoryId: "c2", name: "Alpha" },
  ]);
  return { products, service: createCatalogService({ products, categories }) };
}

const search = (overrides: Partial<ProductSearch> = {}): ProductSearch => ({ limit: 10, ...overrides });

describe("catalog: pagination", () => {
  it("walks every product exactly once across pages", async () => {
    const { service } = setup(25);
    const seen: string[] = [];
    let cursor: string | undefined;

    for (let guard = 0; guard < 10; guard++) {
      const page = await service.search(search({ limit: 10, cursor }));
      seen.push(...page.items.map((p) => p.productId));
      if (!page.hasMore) break;
      cursor = page.nextCursor!;
    }

    expect(seen).toHaveLength(25);
    expect(new Set(seen).size).toBe(25);
  });

  it("reports no more pages when the data ends exactly on a page boundary", async () => {
    const { service } = setup(10);
    const page = await service.search(search({ limit: 10 }));
    expect(page).toMatchObject({ hasMore: false, nextCursor: null });
    expect(page.items).toHaveLength(10);
  });

  it("rejects a tampered cursor", async () => {
    const { service } = setup(3);
    await expect(service.search(search({ cursor: "not-a-cursor" }))).rejects.toBeInstanceOf(ValidationError);
  });

  it("returns an empty page for an empty catalog", async () => {
    const { service } = setup(0);
    expect(await service.search(search())).toEqual({ items: [], hasMore: false, nextCursor: null });
  });
});

describe("catalog: filters", () => {
  it("searches name and description case-insensitively", async () => {
    const { service } = setup(12, (n) => ({
      name: n === 3 ? "Blue Kettle" : `Item ${n}`,
      description: n === 7 ? "works like a KETTLE" : undefined,
    }));
    const page = await service.search(search({ search: "kettle" }));
    expect(page.items.map((p) => p.productId).sort()).toEqual([id(3), id(7)]);
  });

  it("keeps paging past pages where nothing matches", async () => {
    // Only the last product matches; well over one DynamoDB batch of others precede it.
    const { service, products } = setup(250, (n) => ({ name: n === 250 ? "Needle" : `Hay ${n}` }));
    const page = await service.search(search({ search: "needle", limit: 5 }));

    expect(page.items.map((p) => p.productId)).toEqual([id(250)]);
    expect(page.hasMore).toBe(false);
    expect(products.calls.scanPage).toBeGreaterThan(1);
  });

  it("filters by stock and price", async () => {
    const { service } = setup(10, (n) => ({ stock: n % 2 === 0 ? 0 : 3, price: n * 10 }));
    const page = await service.search(search({ inStock: true, minPrice: 30, maxPrice: 70 }));
    expect(page.items.map((p) => p.price)).toEqual([30, 50, 70]);
  });

  it("filters featured products", async () => {
    const { service } = setup(6, (n) => ({ featured: n <= 2 }));
    expect((await service.search(search({ featured: true }))).items).toHaveLength(2);
  });

  it("uses the category index instead of scanning the table", async () => {
    const { service, products } = setup(10, (n) => ({ categoryId: n <= 4 ? "c2" : "c1" }));
    const page = await service.search(search({ categoryId: "c2" }));

    expect(page.items).toHaveLength(4);
    expect(products.calls.queryCategoryPage).toBeGreaterThan(0);
    expect(products.calls.scanPage).toBe(0);
  });

  it("combines a category with text search", async () => {
    const { service } = setup(10, (n) => ({ categoryId: n <= 5 ? "c1" : "c2", name: n % 2 ? "Odd" : "Even" }));
    const page = await service.search(search({ categoryId: "c1", search: "odd" }));
    expect(page.items.map((p) => p.productId)).toEqual([id(1), id(3), id(5)]);
  });
});

describe("catalog: detail and categories", () => {
  it("returns the product, its category and up to four related products", async () => {
    const { service } = setup(8);
    const detail = await service.getDetail(id(2));

    expect(detail.product.productId).toBe(id(2));
    expect(detail.category?.name).toBe("Zeta");
    expect(detail.related).toHaveLength(4);
    expect(detail.related.some((p) => p.productId === id(2))).toBe(false);
  });

  it("throws NotFound for an unknown product", async () => {
    const { service } = setup(2);
    await expect(service.getDetail("nope")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lists categories alphabetically", async () => {
    const { service } = setup(1);
    expect((await service.listCategories()).map((c) => c.name)).toEqual(["Alpha", "Zeta"]);
  });
});
