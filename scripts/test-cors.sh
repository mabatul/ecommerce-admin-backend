#!/usr/bin/env bash
# Hits every verb on every endpoint and checks both the status code AND
# that an Access-Control-Allow-Origin header actually comes back — plain
# curl testing during development missed two real bugs (a 204 response
# with a body, and a route missing its OPTIONS handler entirely) because
# neither shows up unless you specifically check for the CORS header, not
# just the status code. A browser reports both as "blocked by CORS
# policy" with no mention of the real cause, so this checks the thing
# that actually matters.
#
# Usage: BASE=http://localhost:4000 ./scripts/test-cors.sh
# Needs a running backend with the seed data loaded (npm run seed).
BASE="${BASE:-http://localhost:4000}"
PASS=0
FAIL=0

check() {
  local method="$1" path="$2" data="$3" expect="$4"
  local args=(-s -o /dev/null -D - -X "$method" "$BASE$path")
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

# --- products ---
check OPTIONS /api/products "" 204
check GET /api/products "" 200
check POST /api/products '{"productId":"","name":"CORS Test Product","price":9.99,"categoryId":"cat-electronics","stock":1}' 201
check OPTIONS /api/products/prod-001 "" 204
check GET /api/products/prod-001 "" 200
check PUT /api/products/prod-001 '{"name":"Wireless Headphones","price":59.99,"categoryId":"cat-electronics","stock":40}' 200
check GET /api/products/does-not-exist "" 404
check DELETE /api/products/does-not-exist "" 204

# --- categories ---
check OPTIONS /api/categories "" 204
check GET /api/categories "" 200
check POST /api/categories '{"categoryId":"","name":"CORS Test Category"}' 201
check OPTIONS /api/categories/cat-electronics "" 204
check GET /api/categories/cat-electronics "" 200
check PUT /api/categories/cat-electronics '{"name":"Electronics"}' 200
check GET /api/categories/does-not-exist "" 404
check DELETE /api/categories/does-not-exist "" 204

# --- users ---
check OPTIONS /api/users "" 204
check GET /api/users "" 200
check POST /api/users '{"userId":"","name":"CORS Test User","email":"cors@example.test","role":"customer"}' 201
check OPTIONS /api/users/user-001 "" 204
check GET /api/users/user-001 "" 200
check PUT /api/users/user-001 '{"name":"Grace Hopper","email":"grace@example.test","role":"customer"}' 200
check GET /api/users/does-not-exist "" 404
check DELETE /api/users/does-not-exist "" 204

# --- carts ---
check OPTIONS /api/carts "" 204
check GET /api/carts "" 200
check OPTIONS /api/carts/user-001 "" 204
check GET /api/carts/user-001 "" 200
check PUT /api/carts/user-001 '{"items":[{"productId":"prod-001","quantity":1}]}' 200
check DELETE /api/carts/does-not-exist "" 204

# --- wishlists ---
check OPTIONS /api/wishlists "" 204
check GET /api/wishlists "" 200
check OPTIONS /api/wishlists/user-002 "" 204
check GET /api/wishlists/user-002 "" 200
check PUT /api/wishlists/user-002 '{"productIds":["prod-002"]}' 200
check DELETE /api/wishlists/does-not-exist "" 204

# --- stats / health ---
check GET /api/stats "" 200
check GET /api/health "" 200

# --- validation error paths still need CORS too ---
check POST /api/products '{"name":""}' 400
check POST /api/categories '{}' 400
check POST /api/users '{"name":"x"}' 400

echo
echo "PASS=$PASS FAIL=$FAIL"
