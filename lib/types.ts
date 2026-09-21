// Domain types shared by repositories, services and routes.

export interface Product {
  productId: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  stock: number;
  imageUrl?: string;
  featured?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  categoryId: string;
  name: string;
  description?: string;
}

export interface User {
  userId: string;
  name: string;
  email: string;
  role: "admin" | "customer";
  createdAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

// `version` drives optimistic concurrency; carts written before it existed have none.
export interface Cart {
  userId: string;
  items: CartItem[];
  updatedAt: string;
  version?: number;
}

export interface Wishlist {
  userId: string;
  productIds: string[];
  updatedAt: string;
  version?: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
