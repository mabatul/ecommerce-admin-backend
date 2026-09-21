#!/usr/bin/env bash
# Hits every verb on every endpoint and checks status code + CORS header.
# Usage: BASE=http://localhost:4000 [ADMIN_API_KEY=...] ./scripts/test-cors.sh (needs seed data)
# Set ADMIN_API_KEY when the backend has one configured.
#
# Safe to run against a shared environment: it only modifies records it creates
# itself (ids prefixed "cors-test-") and deletes them again at the end.
BASE="${BASE:-http://localhost:4000}"
CUSTOMER="guest-99999999-9999-4999-8999-999999999999"
BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT
PASS=0
FAIL=0

# `check` sends admin credentials (if any) and a customer id; `check_anon` sends neither.
request() {
  local mode="$1" method="$2" path="$3" data="$4" expect="$5"
  local args=(-s -o "$BODY_FILE" -D - -X "$method" "$BASE$path")
  if [ "$mode" = "auth" ]; then
    args+=(-H "X-Customer-Id: $CUSTOMER")
    [ -n "$ADMIN_API_KEY" ] && args+=(-H "Authorization: Bearer $ADMIN_API_KEY")
  fi
  if [ -n "$data" ]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi
  local headers
  headers=$(curl "${args[@]}" 2>/dev/null)
  local status
  status=$(echo "$headers" | head -1 | grep -o '[0-9][0-9][0-9]')
  local cors
  cors=$(echo "$headers" | grep -ci "access-control-allow-origin")

  if [ "$status" = "$expect" ] && [ "$cors" -ge 1 ]; then
    echo "PASS  $method $path -> $status (CORS: yes)"
    PASS=$((PASS+1))
  else
    echo "FAIL  $method $path -> $status (expected $expect) (CORS headers: $cors)"
    FAIL=$((FAIL+1))
  fi
}

check() { request auth "$@"; }
check_anon() { request anon "$@"; }

# Pulls "field":"value" out of the last response body.
last_field() { grep -o "\"$1\":\"[^\"]*\"" "$BODY_FILE" | head -1 | cut -d'"' -f4; }

# --- clean up leftovers from an interrupted earlier run ---
check DELETE /api/products/cors-test-product "" 204
check DELETE /api/categories/cors-test-category "" 204
check DELETE /api/users/cors-test-user "" 204

# --- categories (create our own; seeded ones are only read) ---
check OPTIONS /api/categories "" 204
check GET /api/categories "" 200
check POST /api/categories '{"categoryId":"cors-test-category","name":"CORS Test Category"}' 201
check POST /api/categories '{"categoryId":"cors-test-category","name":"Duplicate"}' 409
check POST /api/categories '{"categoryId":"","name":"CORS Test Generated Category"}' 201
GENERATED_CATEGORY="$(last_field categoryId)"
check OPTIONS /api/categories/cors-test-category "" 204
check GET /api/categories/cors-test-category "" 200
check PUT /api/categories/cors-test-category '{"name":"CORS Test Category (edited)"}' 200
check GET /api/categories/does-not-exist "" 404
check DELETE /api/categories/does-not-exist "" 204

# --- products ---
check OPTIONS /api/products "" 204
check GET /api/products "" 200
check POST /api/products '{"productId":"cors-test-product","name":"CORS Test Product","price":9.99,"categoryId":"cors-test-category","stock":3}' 201
check POST /api/products '{"productId":"cors-test-product","name":"Duplicate","price":1,"categoryId":"cors-test-category"}' 409
check POST /api/products '{"productId":"","name":"CORS Test Generated Product","price":9.99,"categoryId":"cors-test-category","stock":1}' 201
GENERATED_PRODUCT="$(last_field productId)"
check OPTIONS /api/products/cors-test-product "" 204
check GET /api/products/cors-test-product "" 200
check PUT /api/products/cors-test-product '{"name":"CORS Test Product","price":12.5,"categoryId":"cors-test-category","stock":5,"featured":true}' 200
check GET /api/products/does-not-exist "" 404
check PUT /api/products/does-not-exist '{"name":"x","price":1,"categoryId":"cors-test-category"}' 404
check DELETE /api/products/does-not-exist "" 204
check GET /api/products/prod-001 "" 200

# --- a category that still has products cannot be deleted ---
check DELETE /api/categories/cors-test-category "" 409

# --- users ---
check OPTIONS /api/users "" 204
check GET /api/users "" 200
check POST /api/users '{"userId":"cors-test-user","name":"CORS Test User","email":"cors@example.test","role":"customer"}' 201
check POST /api/users '{"userId":"","name":"CORS Test Generated User","email":"generated@example.test"}' 201
GENERATED_USER="$(last_field userId)"
check OPTIONS /api/users/cors-test-user "" 204
check GET /api/users/cors-test-user "" 200
check PUT /api/users/cors-test-user '{"name":"CORS Test User (edited)","email":"cors@example.test","role":"customer"}' 200
check GET /api/users/does-not-exist "" 404
check DELETE /api/users/does-not-exist "" 204

# --- carts (admin) ---
check OPTIONS /api/carts "" 204
check GET /api/carts "" 200
check OPTIONS /api/carts/cors-test-user "" 204
check GET /api/carts/cors-test-user "" 200
check PUT /api/carts/cors-test-user '{"items":[{"productId":"cors-test-product","quantity":1}]}' 200
check PUT /api/carts/cors-test-user '{"items":[{"productId":"cors-test-product","quantity":0}]}' 400
check DELETE /api/carts/does-not-exist "" 204

# --- wishlists (admin) ---
check OPTIONS /api/wishlists "" 204
check GET /api/wishlists "" 200
check OPTIONS /api/wishlists/cors-test-user "" 204
check GET /api/wishlists/cors-test-user "" 200
check PUT /api/wishlists/cors-test-user '{"productIds":["cors-test-product"]}' 200
check DELETE /api/wishlists/does-not-exist "" 204

# --- stats / health ---
check GET /api/stats "" 200
check OPTIONS /api/stats "" 204
check GET /api/health "" 200
check OPTIONS /api/health "" 204
check OPTIONS /api/route-that-does-not-exist "" 204

# --- validation error paths still need CORS too ---
check POST /api/products '{"name":""}' 400
check POST /api/categories '{}' 400
check POST /api/users '{"name":"x"}' 400
check POST /api/products '{oops' 400
check POST /api/products '{"name":"x","price":1,"categoryId":"does-not-exist"}' 400

# --- storefront: catalog (public) ---
check OPTIONS /api/store/products "" 204
check GET /api/store/products "" 200
check GET "/api/store/products?limit=2&search=a&inStock=true" "" 200
check GET "/api/store/products?limit=999" "" 400
check GET "/api/store/products?cursor=garbage" "" 400
check OPTIONS /api/store/products/prod-001 "" 204
check GET /api/store/products/prod-001 "" 200
check GET /api/store/products/does-not-exist "" 404
check OPTIONS /api/store/categories "" 204
check GET /api/store/categories "" 200

# --- storefront: cart (uses our own product; stock 5) ---
check OPTIONS /api/store/cart "" 204
check GET /api/store/cart "" 200
check POST /api/store/cart/items '{"productId":"cors-test-product","quantity":1}' 201
check POST /api/store/cart/items '{"productId":"cors-test-product","quantity":1}' 201
check OPTIONS /api/store/cart/items "" 204
check OPTIONS /api/store/cart/items/cors-test-product "" 204
check PATCH /api/store/cart/items/cors-test-product '{"quantity":2}' 200
check PATCH /api/store/cart/items/cors-test-product '{"quantity":100}' 400
check PATCH /api/store/cart/items/cors-test-product '{"quantity":6}' 409
check PATCH /api/store/cart/items/prod-999 '{"quantity":1}' 404
check POST /api/store/cart/items '{"productId":"does-not-exist","quantity":1}' 404
check POST /api/store/cart/items '{"productId":"cors-test-product","quantity":0}' 400
check DELETE /api/store/cart/items/cors-test-product "" 200
check DELETE /api/store/cart "" 200
check_anon GET /api/store/cart "" 400

# --- storefront: wishlist ---
check OPTIONS /api/store/wishlist "" 204
check GET /api/store/wishlist "" 200
check OPTIONS /api/store/wishlist/items "" 204
check POST /api/store/wishlist/items '{"productId":"cors-test-product"}' 201
check POST /api/store/wishlist/items '{"productId":"cors-test-product"}' 201
check POST /api/store/wishlist/items '{"productId":"does-not-exist"}' 404
check OPTIONS /api/store/wishlist/items/cors-test-product "" 204
check DELETE /api/store/wishlist/items/cors-test-product "" 200
check DELETE /api/store/wishlist "" 200

# --- admin routes reject requests without the admin key (only when one is configured) ---
if [ -n "$ADMIN_API_KEY" ]; then
  check_anon GET /api/products "" 401
  check_anon DELETE /api/products/prod-001 "" 401
  check_anon GET /api/stats "" 401
  check_anon OPTIONS /api/products "" 204
fi

# --- remove everything this run created ---
check DELETE /api/products/cors-test-product "" 204
[ -n "$GENERATED_PRODUCT" ] && check DELETE "/api/products/$GENERATED_PRODUCT" "" 204
check DELETE /api/categories/cors-test-category "" 204
[ -n "$GENERATED_CATEGORY" ] && check DELETE "/api/categories/$GENERATED_CATEGORY" "" 204
check DELETE /api/users/cors-test-user "" 204
[ -n "$GENERATED_USER" ] && check DELETE "/api/users/$GENERATED_USER" "" 204

echo
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
