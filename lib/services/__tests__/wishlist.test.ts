import { describe, expect, it } from "vitest";
import { NotFoundError } from "../../errors";
import { createWishlistService, dedupe } from "../wishlist";
import { fakeProducts, fakeWishlists, makeProduct } from "./fakes";

const USER = "guest-22222222-2222-4222-8222-222222222222";

function setup() {
  const products = fakeProducts([
    makeProduct({ productId: "a", stock: 3 }),
    makeProduct({ productId: "b", stock: 0 }),
  ]);
  const wishlists = fakeWishlists();
  return { products, wishlists, service: createWishlistService({ wishlists, products }) };
}

describe("wishlist", () => {
  it("adds a product", async () => {
    const { service } = setup();
    const view = await service.add(USER, "a");
    expect(view.items.map((i) => i.productId)).toEqual(["a"]);
  });

  it("does not duplicate a product that is already on the list", async () => {
    const { service } = setup();
    await service.add(USER, "a");
    const view = await service.add(USER, "a");
    expect(view.items).toHaveLength(1);
  });

  it("rejects products that do not exist", async () => {
    const { service } = setup();
    await expect(service.add(USER, "nope")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("removes a product, and removing again is harmless", async () => {
    const { service } = setup();
    await service.add(USER, "a");
    expect((await service.remove(USER, "a")).items).toHaveLength(0);
    expect((await service.remove(USER, "a")).items).toHaveLength(0);
  });

  it("marks out-of-stock and deleted products instead of failing", async () => {
    const { service, products } = setup();
    await service.add(USER, "a");
    await service.add(USER, "b");
    products.rows.delete("a");

    const view = await service.view(USER);
    expect(Object.fromEntries(view.items.map((i) => [i.productId, i.status]))).toEqual({
      a: "unavailable",
      b: "out_of_stock",
    });
    expect(view.items.find((i) => i.productId === "a")?.product).toBeNull();
  });

  it("returns an empty wishlist for a new customer", async () => {
    const { service } = setup();
    expect(await service.view(USER)).toEqual({ userId: USER, items: [], updatedAt: null });
  });

  it("admin replace removes duplicates", async () => {
    const { service } = setup();
    const wishlist = await service.replaceProductIds("user-001", ["a", "b", "a"]);
    expect(wishlist?.productIds).toEqual(["a", "b"]);
    expect(dedupe(["x", "x", "y"])).toEqual(["x", "y"]);
  });
});
