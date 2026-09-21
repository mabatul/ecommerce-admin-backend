/**
 * The sample catalog used by both seed scripts: `seed.ts` writes it straight to DynamoDB,
 * `seed-remote.ts` sends it through a running backend's admin API. Everything is synthetic.
 */
export const now = new Date().toISOString();

export const categories = [
  { categoryId: "cat-electronics", name: "Electronics", description: "Gadgets and devices" },
  { categoryId: "cat-home", name: "Home & Kitchen", description: "Household goods" },
  { categoryId: "cat-books", name: "Books", description: "Fiction and non-fiction" },
  { categoryId: "cat-fashion", name: "Fashion", description: "Clothing and accessories" },
  { categoryId: "cat-sports", name: "Sports & Outdoors", description: "Gear for staying active" },
];

// Deterministic placeholder photos (no API key); the storefront falls back if they fail to load.
const product = (
  productId: string,
  name: string,
  price: number,
  categoryId: string,
  stock: number,
  description: string,
  featured = false
) => ({
  productId,
  name,
  price,
  categoryId,
  stock,
  description,
  featured,
  imageUrl: `https://picsum.photos/seed/${productId}/600/600`,
  createdAt: now,
  updatedAt: now,
});

export const products = [
  product("prod-001", "Wireless Headphones", 59.99, "cat-electronics", 40, "Over-ear, noise cancelling", true),
  product("prod-002", "Mechanical Keyboard", 89.99, "cat-electronics", 25, "Hot-swappable switches", true),
  product("prod-003", "French Press", 24.5, "cat-home", 60, "1L glass carafe", true),
  product("prod-004", "Ceramic Knife Set", 34.0, "cat-home", 15, "3-piece set"),
  product("prod-005", "The Pragmatic Programmer", 42.0, "cat-books", 100, "20th anniversary edition", true),
  product("prod-006", "Portable Bluetooth Speaker", 45.0, "cat-electronics", 30, "Waterproof, 12-hour battery"),
  product("prod-007", "USB-C Hub", 29.99, "cat-electronics", 0, "7-in-1 adapter (currently out of stock)"),
  product("prod-008", "Cast Iron Skillet", 38.0, "cat-home", 22, "12-inch, pre-seasoned"),
  product("prod-009", "Clean Code", 39.0, "cat-books", 55, "A handbook of agile software craftsmanship"),
  product("prod-010", "Designing Data-Intensive Applications", 54.0, "cat-books", 3, "The big ideas behind reliable systems"),
  product("prod-011", "Denim Jacket", 69.0, "cat-fashion", 18, "Classic fit, medium wash", true),
  product("prod-012", "Canvas Backpack", 49.5, "cat-fashion", 35, "20L, water-resistant"),
  product("prod-013", "Yoga Mat", 27.0, "cat-sports", 48, "6mm non-slip", true),
  product("prod-014", "Adjustable Dumbbell Set", 129.0, "cat-sports", 8, "5-25 kg per hand"),
  product("prod-015", "Insulated Water Bottle", 22.0, "cat-sports", 75, "750ml, keeps cold for 24h"),
];

export const users = [
  { userId: "user-admin", name: "Ada Admin", email: "ada@example.test", role: "admin" as const, createdAt: now },
  { userId: "user-001", name: "Grace Hopper", email: "grace@example.test", role: "customer" as const, createdAt: now },
  { userId: "user-002", name: "Alan Turing", email: "alan@example.test", role: "customer" as const, createdAt: now },
];

export const sampleCart = {
  userId: "user-001",
  items: [
    { productId: "prod-001", quantity: 1 },
    { productId: "prod-003", quantity: 2 },
  ],
};

export const sampleWishlist = {
  userId: "user-002",
  productIds: ["prod-002", "prod-005"],
};
