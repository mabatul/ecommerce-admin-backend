import { ConflictError, NotFoundError } from "../errors";
import type { Product, Wishlist } from "../types";
import { MAX_WISHLIST_ITEMS } from "../validators";
import { retryOnConflict } from "./optimistic";

export type WishlistStatus = "available" | "out_of_stock" | "unavailable";

export interface WishlistEntry {
  productId: string;
  product: Product | null;
  status: WishlistStatus;
}

export interface WishlistView {
  userId: string;
  items: WishlistEntry[];
  updatedAt: string | null;
}

export interface WishlistDeps {
  wishlists: {
    get(userId: string): Promise<Wishlist | undefined>;
    save(wishlist: Wishlist, expectedVersion: number | null): Promise<void>;
    remove(userId: string): Promise<void>;
  };
  products: { get(productId: string): Promise<Product | undefined> };
}

export const dedupe = (ids: string[]) => [...new Set(ids)];

export function createWishlistService({ wishlists, products }: WishlistDeps) {
  async function mutate(userId: string, change: (ids: string[]) => Promise<string[]> | string[]) {
    await retryOnConflict(async () => {
      const current = await wishlists.get(userId);
      const productIds = await change(current?.productIds ?? []);
      const currentVersion = current ? (current.version ?? 0) : null;

      await wishlists.save(
        { userId, productIds, updatedAt: new Date().toISOString(), version: (currentVersion ?? 0) + 1 },
        currentVersion
      );
    });
  }

  async function view(userId: string): Promise<WishlistView> {
    const wishlist = await wishlists.get(userId);

    const items = await Promise.all(
      (wishlist?.productIds ?? []).map(async (productId): Promise<WishlistEntry> => {
        const product = (await products.get(productId)) ?? null;
        const status: WishlistStatus = !product ? "unavailable" : product.stock <= 0 ? "out_of_stock" : "available";
        return { productId, product, status };
      })
    );

    return { userId, items, updatedAt: wishlist?.updatedAt ?? null };
  }

  return {
    view,

    // Adding something already on the list is a no-op, never a duplicate.
    async add(userId: string, productId: string): Promise<WishlistView> {
      const product = await products.get(productId);
      if (!product) throw new NotFoundError("Product not found");

      await mutate(userId, (ids) => {
        if (ids.includes(productId)) return ids;
        if (ids.length >= MAX_WISHLIST_ITEMS) {
          throw new ConflictError(`A wishlist can hold at most ${MAX_WISHLIST_ITEMS} products`);
        }
        return [...ids, productId];
      });
      return view(userId);
    },

    async remove(userId: string, productId: string): Promise<WishlistView> {
      await mutate(userId, (ids) => ids.filter((id) => id !== productId));
      return view(userId);
    },

    async clear(userId: string): Promise<WishlistView> {
      await wishlists.remove(userId);
      return view(userId);
    },

    // Admin edits: shape is validated upstream; dangling ids are allowed so they can be removed.
    async replaceProductIds(userId: string, productIds: string[]): Promise<Wishlist | undefined> {
      await mutate(userId, () => dedupe(productIds));
      return wishlists.get(userId);
    },
  };
}
