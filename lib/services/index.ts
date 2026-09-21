// Production wiring: real repositories injected into each service.
import { productsRepository } from "../repositories/products";
import { categoriesRepository } from "../repositories/categories";
import { usersRepository } from "../repositories/users";
import { cartsRepository } from "../repositories/carts";
import { wishlistsRepository } from "../repositories/wishlists";
import { createCatalogService } from "./catalog";
import { createCartService } from "./cart";
import { createWishlistService } from "./wishlist";
import { createProductService } from "./products";
import { createCategoryService } from "./categories";
import { createUserService } from "./users";
import { createStatsService } from "./stats";

export const catalogService = createCatalogService({ products: productsRepository, categories: categoriesRepository });
export const cartService = createCartService({ carts: cartsRepository, products: productsRepository });
export const wishlistService = createWishlistService({ wishlists: wishlistsRepository, products: productsRepository });
export const productService = createProductService({ products: productsRepository, categories: categoriesRepository });
export const categoryService = createCategoryService({ categories: categoriesRepository, products: productsRepository });
export const userService = createUserService({
  users: usersRepository,
  carts: cartsRepository,
  wishlists: wishlistsRepository,
});
export const statsService = createStatsService({
  products: productsRepository,
  categories: categoriesRepository,
  users: usersRepository,
  carts: cartsRepository,
  wishlists: wishlistsRepository,
});
