import { describe, expect, it } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "../../errors";
import { createCategoryService } from "../categories";
import { createProductService } from "../products";
import { createStatsService } from "../stats";
import { createUserService } from "../users";
import { fakeCarts, fakeCategories, fakeProducts, fakeUsers, fakeWishlists, makeProduct } from "./fakes";

describe("products service", () => {
  function setup() {
    const products = fakeProducts();
    const categories = fakeCategories([{ categoryId: "c1", name: "Books" }]);
    return { products, service: createProductService({ products, categories }) };
  }
  const input = { name: "Lamp", price: 19.999, categoryId: "c1" };

  it("requires the category to exist", async () => {
    const { service } = setup();
    await expect(service.create({ ...input, categoryId: "missing" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("rounds the price to cents and defaults stock to 0", async () => {
    const { service } = setup();
    const product = await service.create(input);
    expect(product).toMatchObject({ price: 20, stock: 0, featured: false });
    expect(product.productId).toBeTruthy();
  });

  it("refuses to overwrite an existing product through create", async () => {
    const { service } = setup();
    await service.create({ ...input, productId: "fixed" });
    await expect(service.create({ ...input, productId: "fixed" })).rejects.toBeInstanceOf(ConflictError);
  });

  it("keeps createdAt and current stock when an update omits stock", async () => {
    const { service } = setup();
    const created = await service.create({ ...input, stock: 7 });
    const updated = await service.update(created.productId, { ...input, name: "Lamp v2" });

    expect(updated).toMatchObject({ name: "Lamp v2", stock: 7, createdAt: created.createdAt });
  });

  it("updates stock through the same call", async () => {
    const { service } = setup();
    const created = await service.create({ ...input, stock: 7 });
    expect((await service.update(created.productId, { ...input, stock: 0 })).stock).toBe(0);
  });

  it("404s when updating or reading a missing product", async () => {
    const { service } = setup();
    await expect(service.update("nope", input)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.get("nope")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deleting a missing product is not an error", async () => {
    const { service } = setup();
    await expect(service.remove("nope")).resolves.toBeUndefined();
  });
});

describe("categories service", () => {
  function setup() {
    const categories = fakeCategories();
    const products = fakeProducts();
    return { categories, products, service: createCategoryService({ categories, products }) };
  }

  it("refuses to delete a category that still has products", async () => {
    const { service, products } = setup();
    const category = await service.create({ name: "Toys" });
    await products.put(makeProduct({ productId: "x", categoryId: category.categoryId }));

    await expect(service.remove(category.categoryId)).rejects.toMatchObject({ status: 409, details: { productCount: 1 } });
    expect(await service.get(category.categoryId)).toBeTruthy();
  });

  it("deletes an empty category", async () => {
    const { service } = setup();
    const category = await service.create({ name: "Toys" });
    await service.remove(category.categoryId);
    await expect(service.get(category.categoryId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a duplicate id on create", async () => {
    const { service } = setup();
    await service.create({ categoryId: "same", name: "A" });
    await expect(service.create({ categoryId: "same", name: "B" })).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("users service", () => {
  function setup() {
    const users = fakeUsers();
    const carts = fakeCarts();
    const wishlists = fakeWishlists();
    return { users, carts, wishlists, service: createUserService({ users, carts, wishlists }) };
  }

  it("defaults the role to customer", async () => {
    const { service } = setup();
    expect((await service.create({ name: "Ann", email: "ann@example.test" })).role).toBe("customer");
  });

  it("deleting a user also deletes their cart and wishlist", async () => {
    const { service, carts, wishlists } = setup();
    const user = await service.create({ name: "Ann", email: "ann@example.test" });
    carts.rows.set(user.userId, { userId: user.userId, items: [], updatedAt: "" });
    wishlists.rows.set(user.userId, { userId: user.userId, productIds: [], updatedAt: "" });

    await service.remove(user.userId);

    expect(carts.rows.has(user.userId)).toBe(false);
    expect(wishlists.rows.has(user.userId)).toBe(false);
    await expect(service.get(user.userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("keeps the existing role and createdAt on update when the role is omitted", async () => {
    const { service } = setup();
    const admin = await service.create({ name: "Ada", email: "ada@example.test", role: "admin" });
    const updated = await service.update(admin.userId, { name: "Ada L.", email: "ada@example.test" });
    expect(updated).toMatchObject({ role: "admin", createdAt: admin.createdAt, name: "Ada L." });
  });
});

describe("stats service", () => {
  it("counts cart units and wishlist products, not the number of carts", async () => {
    const stats = createStatsService({
      products: fakeProducts([makeProduct({ productId: "a" }), makeProduct({ productId: "b" })]),
      categories: fakeCategories([{ categoryId: "c1", name: "X" }]),
      users: fakeUsers(),
      carts: fakeCarts([
        { userId: "u1", items: [{ productId: "a", quantity: 2 }, { productId: "b", quantity: 3 }], updatedAt: "" },
        { userId: "u2", items: [{ productId: "a", quantity: 1 }], updatedAt: "" },
      ]),
      wishlists: fakeWishlists([{ userId: "u1", productIds: ["a", "b", "c"], updatedAt: "" }]),
    });

    expect(await stats.dashboard()).toMatchObject({
      totalProducts: 2,
      totalCategories: 1,
      totalUsers: 0,
      cartItems: 6,
      wishlistItems: 3,
    });
  });
});
