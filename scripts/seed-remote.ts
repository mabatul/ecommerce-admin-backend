/**
 * Loads the sample data into a *running* backend through its admin API, so it works against
 * a deployed environment (e.g. Railway, where the database is only reachable from inside the
 * private network). Idempotent: existing records are updated, not duplicated.
 *
 *   API_URL=https://<backend> ADMIN_API_KEY=<key> npm run seed:remote
 */
import { categories, products, sampleCart, sampleWishlist, users } from "./seed-data";

const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");
const KEY = process.env.ADMIN_API_KEY?.trim();

async function call(method: string, path: string, body?: unknown): Promise<number> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(KEY ? { Authorization: `Bearer ${KEY}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401) throw new Error("The backend rejected the admin key (401). Set ADMIN_API_KEY.");
  return response.status;
}

// Create; if it already exists (409), replace it with the same data.
async function upsert(kind: string, collection: string, id: string, body: object) {
  let status = await call("POST", `/api/${collection}`, body);
  if (status === 409) status = await call("PUT", `/api/${collection}/${encodeURIComponent(id)}`, body);
  if (status !== 200 && status !== 201) throw new Error(`${kind} ${id}: unexpected status ${status}`);
}

async function main() {
  console.log(`Seeding ${API_URL} through the admin API${KEY ? "" : " (no ADMIN_API_KEY set)"}`);

  for (const c of categories) await upsert("category", "categories", c.categoryId, c);
  console.log(`  categories: ${categories.length}`);

  // createdAt/updatedAt are set by the server; unknown fields are ignored by validation.
  for (const p of products) await upsert("product", "products", p.productId, p);
  console.log(`  products: ${products.length}`);

  for (const u of users) await upsert("user", "users", u.userId, u);
  console.log(`  users: ${users.length}`);

  const cart = await call("PUT", `/api/carts/${sampleCart.userId}`, { items: sampleCart.items });
  const wishlist = await call("PUT", `/api/wishlists/${sampleWishlist.userId}`, { productIds: sampleWishlist.productIds });
  if (cart !== 200 || wishlist !== 200) throw new Error(`cart/wishlist: unexpected status ${cart}/${wishlist}`);
  console.log("  carts: 1, wishlists: 1");

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
