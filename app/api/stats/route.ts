import { json, withErrorHandling } from "@/lib/http/cors";
import { productsRepository } from "@/lib/repositories/products";
import { categoriesRepository } from "@/lib/repositories/categories";
import { usersRepository } from "@/lib/repositories/users";
import { cartsRepository } from "@/lib/repositories/carts";
import { wishlistsRepository } from "@/lib/repositories/wishlists";

// Everything the dashboard needs, one request.
export const GET = withErrorHandling(async () => {
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
});
