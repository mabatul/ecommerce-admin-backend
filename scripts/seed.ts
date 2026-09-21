/**
 * Reproducible local seed data (spec section 24).
 *
 * Uses the exact same repositories/config as the running application, so it
 * naturally targets whatever AWS_ENDPOINT_URL / ENVIRONMENT is set to
 * (LocalStack by default). No real user data — everything here is synthetic.
 *
 * Usage:
 *   npm run seed                  (from backend/, with env vars already set)
 *   ../scripts/seed-local.sh      (wraps this via `docker compose exec backend`)
 *
 * To load the same data into a *deployed* backend (no database access needed) use
 * `npm run seed:remote` instead — see seed-remote.ts.
 */
import { usersRepository } from "../lib/repositories/users";
import { categoriesRepository } from "../lib/repositories/categories";
import { productsRepository } from "../lib/repositories/products";
import { cartsRepository } from "../lib/repositories/carts";
import { wishlistsRepository } from "../lib/repositories/wishlists";
import { environment, isLocalStack, region } from "../lib/aws/config";
import { categories, now, products, sampleCart, sampleWishlist, users } from "./seed-data";

async function seed() {
  console.log(`Seeding ${environment} environment (${isLocalStack ? "LocalStack" : "AWS"}, region=${region})`);

  for (const category of categories) {
    await categoriesRepository.put(category);
  }
  console.log(`  categories: ${categories.length}`);

  for (const product of products) {
    await productsRepository.put(product);
  }
  console.log(`  products: ${products.length}`);

  for (const user of users) {
    await usersRepository.put(user);
  }
  console.log(`  users: ${users.length}`);

  await cartsRepository.put({ ...sampleCart, updatedAt: now });
  console.log("  carts: 1");

  await wishlistsRepository.put({ ...sampleWishlist, updatedAt: now });
  console.log("  wishlists: 1");

  console.log("Seed complete.");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
