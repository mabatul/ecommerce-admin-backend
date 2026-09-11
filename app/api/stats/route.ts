import { json } from "@/lib/http/cors";
import { productsRepository } from "@/lib/repositories/products";
import { categoriesRepository } from "@/lib/repositories/categories";
import { usersRepository } from "@/lib/repositories/users";
import { cartsRepository } from "@/lib/repositories/carts";
import { wishlistsRepository } from "@/lib/repositories/wishlists";

// One request for everything the dashboard needs, instead of the frontend
// fetching all 5 lists and counting client-side — same data, one round
// trip. Counts a cart/wishlist as "active" when it has at least one item,
// since an empty row still exists in the table for any user who's ever
// touched their cart/wishlist page.
export async function GET() {
  const [products, categories, users, carts, wishlists] = await Promise.all([
    productsRepository.list(),
    categoriesRepository.list(),
    usersRepository.list(),
    cartsRepository.list(),
    wishlistsRepository.list(),
  ]);

  const recentProducts = [...products]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const recentUsers = [...users]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return json({
    totalUsers: users.length,
    totalProducts: products.length,
    totalCategories: categories.length,
    cartItems: carts.filter((c) => c.items.length > 0).length,
    wishlistItems: wishlists.filter((w) => w.productIds.length > 0).length,
    recentProducts,
    recentUsers,
  });
}
