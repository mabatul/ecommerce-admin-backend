import { describe, expect, it } from "vitest";
import { ValidationError } from "../errors";
import { decodeCursor, encodeCursor } from "../pagination";
import {
  addToCartSchema,
  adminCartSchema,
  categorySchema,
  parse,
  productSchema,
  productSearchSchema,
  searchParamsToObject,
  userSchema,
} from "../validators";

const validProduct = { name: "Lamp", price: 10, categoryId: "c1" };

describe("product validation", () => {
  it("accepts a minimal product", () => {
    expect(parse(productSchema, validProduct)).toMatchObject(validProduct);
  });

  it.each([
    ["empty name", { ...validProduct, name: "  " }],
    ["negative price", { ...validProduct, price: -1 }],
    ["price as a string", { ...validProduct, price: "10" }],
    ["missing category", { name: "Lamp", price: 10 }],
    ["fractional stock", { ...validProduct, stock: 1.5 }],
    ["negative stock", { ...validProduct, stock: -3 }],
    ["javascript: image URL", { ...validProduct, imageUrl: "javascript:alert(1)" }],
    ["non-URL image", { ...validProduct, imageUrl: "not a url" }],
  ])("rejects %s", (_label, body) => {
    expect(() => parse(productSchema, body)).toThrow(ValidationError);
  });

  it("treats empty strings from forms as not provided", () => {
    const parsed = parse(productSchema, { ...validProduct, productId: "", description: "", imageUrl: "" });
    expect(parsed.productId).toBeUndefined();
    expect(parsed.description).toBeUndefined();
    expect(parsed.imageUrl).toBeUndefined();
  });

  it("reports which field failed", () => {
    expect(() => parse(productSchema, { ...validProduct, price: -1 })).toThrow(/price/);
  });
});

describe("category and user validation", () => {
  it("requires a category name", () => {
    expect(() => parse(categorySchema, {})).toThrow(ValidationError);
  });

  it("validates and lowercases emails", () => {
    expect(parse(userSchema, { name: "Ann", email: " ANN@Example.test " }).email).toBe("ann@example.test");
    expect(() => parse(userSchema, { name: "Ann", email: "nope" })).toThrow(ValidationError);
  });

  it("rejects an unknown role", () => {
    expect(() => parse(userSchema, { name: "Ann", email: "a@b.co", role: "root" })).toThrow(ValidationError);
  });
});

describe("cart validation", () => {
  it("never carries a client-supplied price through", () => {
    const parsed = parse(addToCartSchema, { productId: "p1", quantity: 2, price: 0.01, stock: 9999 });
    expect(parsed).toEqual({ productId: "p1", quantity: 2 });
  });

  it("defaults quantity to 1", () => {
    expect(parse(addToCartSchema, { productId: "p1" }).quantity).toBe(1);
  });

  it.each([0, -1, 1.5, 100, "2", null])("rejects quantity %p", (quantity) => {
    expect(() => parse(addToCartSchema, { productId: "p1", quantity })).toThrow(ValidationError);
  });

  it("validates every item of an admin cart replace", () => {
    expect(() => parse(adminCartSchema, { items: [{ productId: "p1", quantity: 0 }] })).toThrow(ValidationError);
    expect(() => parse(adminCartSchema, { items: "nope" })).toThrow(ValidationError);
  });
});

describe("search validation", () => {
  it("coerces query-string values and applies the default page size", () => {
    const parsed = parse(
      productSearchSchema,
      searchParamsToObject(new URLSearchParams("search=lamp&inStock=true&minPrice=5&maxPrice=50&featured=false"))
    );
    expect(parsed).toMatchObject({ search: "lamp", inStock: true, minPrice: 5, maxPrice: 50, featured: false, limit: 12 });
  });

  it.each(["limit=0", "limit=500", "limit=abc", "minPrice=abc", "inStock=maybe", "minPrice=9&maxPrice=3"])(
    "rejects %s",
    (query) => {
      expect(() => parse(productSearchSchema, searchParamsToObject(new URLSearchParams(query)))).toThrow(ValidationError);
    }
  );

  it("ignores blank parameters", () => {
    const parsed = parse(productSearchSchema, searchParamsToObject(new URLSearchParams("search=&categoryId=&limit=")));
    expect(parsed.search).toBeUndefined();
    expect(parsed.categoryId).toBeUndefined();
    expect(parsed.limit).toBe(12);
  });
});

describe("cursors", () => {
  it("round-trips an id", () => {
    expect(decodeCursor(encodeCursor("prod-001"))).toBe("prod-001");
  });

  it.each(["", "!!!", Buffer.from("{}").toString("base64url"), Buffer.from('{"id":5}').toString("base64url")])(
    "rejects malformed cursor %p",
    (cursor) => {
      expect(() => decodeCursor(cursor)).toThrow(ValidationError);
    }
  );
});
