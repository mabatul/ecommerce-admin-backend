import { describe, expect, it } from "vitest";
import { ConflictError, NotFoundError } from "../../errors";
import { createCartService, mergeDuplicates } from "../cart";
import { fakeCarts, fakeProducts, makeProduct } from "./fakes";

const USER = "guest-11111111-1111-4111-8111-111111111111";

function setup(products = [makeProduct({ productId: "p1", price: 10, stock: 5 })]) {
  const carts = fakeCarts();
  const productRepo = fakeProducts(products);
  return { carts, products: productRepo, service: createCartService({ carts, products: productRepo }) };
}

describe("cart: adding items", () => {
  it("creates a line priced from the database", async () => {
    const { service } = setup();
    const view = await service.add(USER, { productId: "p1", quantity: 2 });

    expect(view.lines).toHaveLength(1);
    expect(view.lines[0]).toMatchObject({ productId: "p1", quantity: 2, unitPrice: 10, lineTotal: 20, status: "ok" });
    expect(view.subtotal).toBe(20);
    expect(view.totalQuantity).toBe(2);
  });

  it("merges a repeated product into one line instead of duplicating it", async () => {
    const { service } = setup();
    await service.add(USER, { productId: "p1", quantity: 2 });
    const view = await service.add(USER, { productId: "p1", quantity: 1 });

    expect(view.lines).toHaveLength(1);
    expect(view.lines[0].quantity).toBe(3);
  });

  it("rejects a quantity above stock and leaves the cart untouched", async () => {
    const { service } = setup();
    await service.add(USER, { productId: "p1", quantity: 1 });

    await expect(service.add(USER, { productId: "p1", quantity: 6 })).rejects.toMatchObject({
      status: 409,
      details: { availableStock: 5 },
    });
    expect((await service.view(USER)).lines[0].quantity).toBe(1);
  });

  it("counts what is already in the cart against stock", async () => {
    const { service } = setup();
    await service.add(USER, { productId: "p1", quantity: 4 });

    const error = await service.add(USER, { productId: "p1", quantity: 2 }).catch((e) => e);
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.message).toContain("4 already in your cart");
  });

  it("accepts exactly the available stock", async () => {
    const { service } = setup();
    const view = await service.add(USER, { productId: "p1", quantity: 5 });
    expect(view.lines[0].quantity).toBe(5);
  });

  it("rejects out-of-stock products", async () => {
    const { service } = setup([makeProduct({ productId: "p1", stock: 0 })]);
    await expect(service.add(USER, { productId: "p1", quantity: 1 })).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects unknown products", async () => {
    const { service } = setup();
    await expect(service.add(USER, { productId: "nope", quantity: 1 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("caps the quantity of one product", async () => {
    const { service } = setup([makeProduct({ productId: "p1", stock: 1000 })]);
    await service.add(USER, { productId: "p1", quantity: 99 });
    await expect(service.add(USER, { productId: "p1", quantity: 1 })).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("cart: updating and removing", () => {
  it("sets a new quantity within stock", async () => {
    const { service } = setup();
    await service.add(USER, { productId: "p1", quantity: 1 });
    const view = await service.setQuantity(USER, "p1", 4);
    expect(view.lines[0].quantity).toBe(4);
  });

  it("rejects a new quantity above stock", async () => {
    const { service } = setup();
    await service.add(USER, { productId: "p1", quantity: 1 });
    await expect(service.setQuantity(USER, "p1", 6)).rejects.toBeInstanceOf(ConflictError);
  });

  it("cannot set the quantity of something not in the cart", async () => {
    const { service } = setup();
    await expect(service.setQuantity(USER, "p1", 1)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("removes a line, and removing again is harmless", async () => {
    const { service } = setup();
    await service.add(USER, { productId: "p1", quantity: 1 });

    expect((await service.remove(USER, "p1")).lines).toHaveLength(0);
    expect((await service.remove(USER, "p1")).lines).toHaveLength(0);
  });

  it("clears the whole cart", async () => {
    const { service } = setup();
    await service.add(USER, { productId: "p1", quantity: 1 });
    const view = await service.clear(USER);
    expect(view).toMatchObject({ lines: [], subtotal: 0, totalQuantity: 0, hasIssues: false });
  });
});

describe("cart: viewing", () => {
  it("returns an empty cart for a new customer", async () => {
    const { service } = setup();
    expect(await service.view(USER)).toMatchObject({ lines: [], subtotal: 0, updatedAt: null });
  });

  it("flags deleted, out-of-stock and over-stock lines and prices only the good ones", async () => {
    const { service, products } = setup([
      makeProduct({ productId: "ok", price: 10, stock: 10 }),
      makeProduct({ productId: "gone", price: 5, stock: 10 }),
      makeProduct({ productId: "empty", price: 5, stock: 10 }),
      makeProduct({ productId: "low", price: 5, stock: 10 }),
    ]);
    for (const id of ["ok", "gone", "empty", "low"]) await service.add(USER, { productId: id, quantity: 3 });

    products.rows.delete("gone");
    products.rows.set("empty", makeProduct({ productId: "empty", stock: 0 }));
    products.rows.set("low", makeProduct({ productId: "low", price: 5, stock: 2 }));

    const view = await service.view(USER);
    const status = Object.fromEntries(view.lines.map((l) => [l.productId, l.status]));

    expect(status).toEqual({ ok: "ok", gone: "unavailable", empty: "unavailable", low: "insufficient_stock" });
    expect(view.subtotal).toBe(30);
    expect(view.totalQuantity).toBe(12);
    expect(view.hasIssues).toBe(true);
  });

  it("uses the current price, not whatever was true when the item was added", async () => {
    const { service, products } = setup();
    await service.add(USER, { productId: "p1", quantity: 2 });
    products.rows.set("p1", makeProduct({ productId: "p1", price: 12.5, stock: 5 }));

    expect((await service.view(USER)).subtotal).toBe(25);
  });
});

describe("cart: concurrent writes", () => {
  it("retries when another request changes the cart in between", async () => {
    const { service, carts } = setup([makeProduct({ productId: "p1", stock: 50 })]);
    await service.add(USER, { productId: "p1", quantity: 1 });

    let raced = false;
    carts.beforeSave = () => {
      if (raced) return;
      raced = true;
      const current = carts.rows.get(USER)!;
      carts.rows.set(USER, { ...current, items: [{ productId: "p1", quantity: 10 }], version: (current.version ?? 0) + 1 });
    };

    const view = await service.add(USER, { productId: "p1", quantity: 1 });
    expect(view.lines[0].quantity).toBe(11); // 10 from the racing write + our 1, nothing lost
  });

  it("gives up with a conflict if the cart keeps changing", async () => {
    const { service, carts } = setup();
    await service.add(USER, { productId: "p1", quantity: 1 });

    carts.beforeSave = () => {
      const current = carts.rows.get(USER)!;
      carts.rows.set(USER, { ...current, version: (current.version ?? 0) + 1 });
    };

    await expect(service.add(USER, { productId: "p1", quantity: 1 })).rejects.toBeInstanceOf(ConflictError);
  });

  it("can update a cart saved before versions existed", async () => {
    const { service, carts } = setup();
    carts.rows.set(USER, { userId: USER, items: [{ productId: "p1", quantity: 1 }], updatedAt: "2026-01-01T00:00:00.000Z" });

    const view = await service.add(USER, { productId: "p1", quantity: 1 });
    expect(view.lines[0].quantity).toBe(2);
    expect(carts.rows.get(USER)?.version).toBe(1);
  });
});

describe("cart: admin replace", () => {
  it("merges duplicates and does not enforce stock", async () => {
    const { service } = setup();
    const cart = await service.replaceItems("user-001", [
      { productId: "p1", quantity: 40 },
      { productId: "p1", quantity: 2 },
    ]);
    expect(cart?.items).toEqual([{ productId: "p1", quantity: 42 }]);
  });

  it("mergeDuplicates keeps distinct products apart", () => {
    expect(
      mergeDuplicates([
        { productId: "a", quantity: 1 },
        { productId: "b", quantity: 2 },
        { productId: "a", quantity: 3 },
      ])
    ).toEqual([
      { productId: "a", quantity: 4 },
      { productId: "b", quantity: 2 },
    ]);
  });
});
