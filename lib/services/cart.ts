import { ConflictError, NotFoundError } from "../errors";
import type { Cart, CartItem, Product } from "../types";
import { MAX_CART_LINES, MAX_LINE_QUANTITY } from "../validators";
import { retryOnConflict } from "./optimistic";

export type LineStatus = "ok" | "insufficient_stock" | "unavailable";

export interface CartLine {
  productId: string;
  quantity: number;
  name: string | null;
  imageUrl?: string;
  unitPrice: number | null;
  lineTotal: number;
  availableStock: number;
  status: LineStatus;
}

export interface CartView {
  userId: string;
  lines: CartLine[];
  subtotal: number; // only lines with status "ok"
  totalQuantity: number; // every line, so the header badge matches what's in the cart
  hasIssues: boolean;
  updatedAt: string | null;
}

export interface CartDeps {
  carts: {
    get(userId: string): Promise<Cart | undefined>;
    save(cart: Cart, expectedVersion: number | null): Promise<void>;
    remove(userId: string): Promise<void>;
  };
  products: { get(productId: string): Promise<Product | undefined> };
}

const money = (value: number) => Math.round(value * 100) / 100;

// Same product listed twice -> one line with the summed quantity.
export function mergeDuplicates(items: CartItem[]): CartItem[] {
  const merged = new Map<string, number>();
  for (const { productId, quantity } of items) {
    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

export function createCartService({ carts, products }: CartDeps) {
  async function requireProduct(productId: string): Promise<Product> {
    const product = await products.get(productId);
    if (!product) throw new NotFoundError("Product not found");
    return product;
  }

  function assertPurchasable(product: Product, wanted: number, inCart: number) {
    if (wanted > MAX_LINE_QUANTITY) {
      throw new ConflictError(`You can order at most ${MAX_LINE_QUANTITY} of the same product`);
    }
    if (product.stock <= 0) {
      throw new ConflictError(`"${product.name}" is out of stock`, { availableStock: 0 });
    }
    if (wanted > product.stock) {
      const inCartNote = inCart > 0 ? ` (${inCart} already in your cart)` : "";
      throw new ConflictError(`Only ${product.stock} of "${product.name}" available${inCartNote}`, {
        availableStock: product.stock,
      });
    }
  }

  // Read-modify-write guarded by the cart version, retried if another request won the race.
  async function mutate(userId: string, change: (items: CartItem[]) => Promise<CartItem[]> | CartItem[]) {
    await retryOnConflict(async () => {
      const current = await carts.get(userId);
      const items = await change(current?.items ?? []);
      const currentVersion = current ? (current.version ?? 0) : null;

      await carts.save(
        { userId, items, updatedAt: new Date().toISOString(), version: (currentVersion ?? 0) + 1 },
        currentVersion
      );
    });
  }

  async function view(userId: string): Promise<CartView> {
    const cart = await carts.get(userId);
    const items = cart?.items ?? [];

    // Prices and stock always come from the database, never from the client.
    const lines = await Promise.all(
      items.map(async ({ productId, quantity }): Promise<CartLine> => {
        const product = await products.get(productId);
        if (!product) {
          return { productId, quantity, name: null, unitPrice: null, lineTotal: 0, availableStock: 0, status: "unavailable" };
        }

        const status: LineStatus =
          product.stock <= 0 ? "unavailable" : quantity > product.stock ? "insufficient_stock" : "ok";

        return {
          productId,
          quantity,
          name: product.name,
          imageUrl: product.imageUrl,
          unitPrice: product.price,
          lineTotal: status === "ok" ? money(product.price * quantity) : 0,
          availableStock: product.stock,
          status,
        };
      })
    );

    return {
      userId,
      lines,
      subtotal: money(lines.reduce((sum, line) => sum + line.lineTotal, 0)),
      totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
      hasIssues: lines.some((line) => line.status !== "ok"),
      updatedAt: cart?.updatedAt ?? null,
    };
  }

  return {
    view,

    async add(userId: string, input: { productId: string; quantity: number }): Promise<CartView> {
      await mutate(userId, async (items) => {
        const product = await requireProduct(input.productId);
        const existing = items.find((item) => item.productId === input.productId);
        const total = (existing?.quantity ?? 0) + input.quantity;

        assertPurchasable(product, total, existing?.quantity ?? 0);

        if (existing) {
          return items.map((item) => (item.productId === input.productId ? { ...item, quantity: total } : item));
        }
        if (items.length >= MAX_CART_LINES) {
          throw new ConflictError(`A cart can hold at most ${MAX_CART_LINES} different products`);
        }
        return [...items, { productId: input.productId, quantity: input.quantity }];
      });
      return view(userId);
    },

    async setQuantity(userId: string, productId: string, quantity: number): Promise<CartView> {
      await mutate(userId, async (items) => {
        if (!items.some((item) => item.productId === productId)) {
          throw new NotFoundError("That product is not in your cart");
        }
        assertPurchasable(await requireProduct(productId), quantity, 0);
        return items.map((item) => (item.productId === productId ? { ...item, quantity } : item));
      });
      return view(userId);
    },

    async remove(userId: string, productId: string): Promise<CartView> {
      await mutate(userId, (items) => items.filter((item) => item.productId !== productId));
      return view(userId);
    },

    async clear(userId: string): Promise<CartView> {
      await carts.remove(userId);
      return view(userId);
    },

    // Admin edits (e.g. removing one item): shape is validated upstream, stock is not enforced.
    async replaceItems(userId: string, items: CartItem[]): Promise<Cart | undefined> {
      await mutate(userId, () => mergeDuplicates(items));
      return carts.get(userId);
    },
  };
}
