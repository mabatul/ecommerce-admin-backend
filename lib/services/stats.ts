import type { Cart, Category, Product, User, Wishlist } from "../types";

export interface StatsDeps {
  products: { list(): Promise<Product[]> };
  categories: { list(): Promise<Category[]> };
  users: { list(): Promise<User[]> };
  carts: { list(): Promise<Cart[]> };
  wishlists: { list(): Promise<Wishlist[]> };
}

const newestFirst = <T extends { createdAt: string }>(rows: T[], count: number) =>
  [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, count);

// Everything the admin dashboard needs, in one call.
export function createStatsService({ products, categories, users, carts, wishlists }: StatsDeps) {
  return {
    async dashboard() {
      const [allProducts, allCategories, allUsers, allCarts, allWishlists] = await Promise.all([
        products.list(),
        categories.list(),
        users.list(),
        carts.list(),
        wishlists.list(),
      ]);

      return {
        totalUsers: allUsers.length,
        totalProducts: allProducts.length,
        totalCategories: allCategories.length,
        // Units across all carts / products across all wishlists (not the number of carts).
        cartItems: allCarts.reduce((sum, cart) => sum + cart.items.reduce((n, item) => n + item.quantity, 0), 0),
        wishlistItems: allWishlists.reduce((sum, wishlist) => sum + wishlist.productIds.length, 0),
        recentProducts: newestFirst(allProducts, 5),
        recentUsers: newestFirst(allUsers, 5),
      };
    },
  };
}
