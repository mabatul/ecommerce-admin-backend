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
 */
import { usersRepository } from "../lib/repositories/users";
import { categoriesRepository } from "../lib/repositories/categories";
import { productsRepository } from "../lib/repositories/products";
import { cartsRepository } from "../lib/repositories/carts";
import { wishlistsRepository } from "../lib/repositories/wishlists";
import { environment, isLocalStack, region } from "../lib/aws/config";

const now = new Date().toISOString();

const categories = [
  { categoryId: "cat-electronics", name: "Electronics", description: "Gadgets and devices" },
  { categoryId: "cat-home", name: "Home & Kitchen", description: "Household goods" },
  { categoryId: "cat-books", name: "Books", description: "Fiction and non-fiction" },
];

const products = [
  { productId: "prod-001", name: "Wireless Headphones", price: 59.99, categoryId: "cat-electronics", stock: 40, description: "Over-ear, noise cancelling", createdAt: now },
  { productId: "prod-002", name: "Mechanical Keyboard", price: 89.99, categoryId: "cat-electronics", stock: 25, description: "Hot-swappable switches", createdAt: now },
  { productId: "prod-003", name: "French Press", price: 24.5, categoryId: "cat-home", stock: 60, description: "1L glass carafe", createdAt: now },
  { productId: "prod-004", name: "Ceramic Knife Set", price: 34.0, categoryId: "cat-home", stock: 15, description: "3-piece set", createdAt: now },
  { productId: "prod-005", name: "The Pragmatic Programmer", price: 42.0, categoryId: "cat-books", stock: 100, description: "20th anniversary edition", createdAt: now },
];

const users = [
  { userId: "user-admin", name: "Ada Admin", email: "ada@example.test", role: "admin" as const, createdAt: now },
  { userId: "user-001", name: "Grace Hopper", email: "grace@example.test", role: "customer" as const, createdAt: now },
  { userId: "user-002", name: "Alan Turing", email: "alan@example.test", role: "customer" as const, createdAt: now },
];

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

  await cartsRepository.put({
    userId: "user-001",
    items: [
      { productId: "prod-001", quantity: 1 },
      { productId: "prod-003", quantity: 2 },
    ],
    updatedAt: now,
  });
  console.log("  carts: 1");

  await wishlistsRepository.put({
    userId: "user-002",
    productIds: ["prod-002", "prod-005"],
    updatedAt: now,
  });
  console.log("  wishlists: 1");

  console.log("Seed complete.");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
