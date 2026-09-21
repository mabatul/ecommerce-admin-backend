import { z } from "zod";
import { ValidationError } from "../errors";

export const MAX_LINE_QUANTITY = 99;
export const MAX_CART_LINES = 50;
export const MAX_WISHLIST_ITEMS = 200;
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 48;

// Forms send "" for untouched optional fields; treat that as "not provided".
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const isHttpUrl = (value: string) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(2000).refine(isHttpUrl, "must be an http(s) URL").optional()
);

const id = z.string().trim().min(1).max(200);

export const productSchema = z.object({
  productId: z.preprocess(emptyToUndefined, id.optional()),
  name: z.string().trim().min(1).max(120),
  description: optionalText(2000),
  price: z.number().min(0).max(1_000_000),
  categoryId: id,
  stock: z.int().min(0).max(1_000_000).optional(),
  imageUrl: optionalUrl,
  featured: z.boolean().optional(),
});

export const categorySchema = z.object({
  categoryId: z.preprocess(emptyToUndefined, id.optional()),
  name: z.string().trim().min(1).max(80),
  description: optionalText(500),
});

export const userSchema = z.object({
  userId: z.preprocess(emptyToUndefined, id.optional()),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  role: z.enum(["admin", "customer"]).optional(),
});

const cartItemSchema = z.object({
  productId: id,
  quantity: z.int().min(1).max(MAX_LINE_QUANTITY),
});

export const adminCartSchema = z.object({
  items: z.array(cartItemSchema).max(MAX_CART_LINES),
});

export const adminWishlistSchema = z.object({
  productIds: z.array(id).max(MAX_WISHLIST_ITEMS),
});

export const addToCartSchema = z.object({
  productId: id,
  quantity: z.int().min(1).max(MAX_LINE_QUANTITY).default(1),
});

export const setQuantitySchema = z.object({
  quantity: z.int().min(1).max(MAX_LINE_QUANTITY),
});

export const addToWishlistSchema = z.object({ productId: id });

export const productSearchSchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    categoryId: id.optional(),
    inStock: z.boolean().optional(),
    featured: z.boolean().optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
    limit: z.int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    cursor: z.string().max(400).optional(),
  })
  .refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
    message: "minPrice must be <= maxPrice",
    path: ["minPrice"],
  });

export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type UserInput = z.infer<typeof userSchema>;
export type ProductSearch = z.infer<typeof productSearchSchema>;

// Query strings are all strings: coerce, and let the schema reject garbage.
export function searchParamsToObject(params: URLSearchParams): Record<string, unknown> {
  const number = (key: string) => {
    const raw = params.get(key);
    return raw === null || raw.trim() === "" ? undefined : Number(raw);
  };
  const boolean = (key: string) => {
    const raw = params.get(key);
    if (raw === null || raw === "") return undefined;
    return raw === "true" ? true : raw === "false" ? false : raw;
  };
  const text = (key: string) => {
    const raw = params.get(key);
    return raw === null || raw === "" ? undefined : raw;
  };

  return {
    search: text("search"),
    categoryId: text("categoryId"),
    inStock: boolean("inStock"),
    featured: boolean("featured"),
    minPrice: number("minPrice"),
    maxPrice: number("maxPrice"),
    limit: number("limit"),
    cursor: text("cursor"),
  };
}

export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const details = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  const first = details[0];
  const where = first?.path ? `${first.path}: ` : "";
  throw new ValidationError(`Invalid request — ${where}${first?.message ?? "bad input"}`, details);
}
