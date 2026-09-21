# ecommerce-admin-backend

REST API (Next.js, API-only — no pages) for the e-commerce application. It
serves two clients:

- the **admin dashboard** ([`ecommerce-admin-frontend`](../ecommerce-admin-frontend)) —
  full management of products, categories, users, carts and wishlists;
- the **customer storefront** ([`ecommerce-storefront`](../ecommerce-storefront)) —
  browsing, search, cart and wishlist.

It talks to DynamoDB through [`lib/aws/config.ts`](lib/aws/config.ts), which
resolves region, endpoint, credentials and table names **only** from
environment variables.

Part of a multi-repo project — see
[`ecommerce-admin-infra`](../ecommerce-admin-infra) for the overall
architecture, the infrastructure (CloudFormation/LocalStack), the DynamoDB
data model, and how to bring everything up together locally.

## Running with Docker (recommended)

This repo has its own `docker-compose.yml` and starts **independently** —
it doesn't build or need `ecommerce-admin-infra`'s compose file. It just
needs LocalStack (or whatever `AWS_ENDPOINT_URL` points to) already
reachable. Bring up the infrastructure first (from `ecommerce-admin-infra`:
`docker compose up`), then, from here:

```bash
docker compose up
```

Reaches LocalStack via `host.docker.internal:4566` by default (see
`docker-compose.yml` and `.env.example`) — no shared Docker network needed,
since LocalStack already publishes 4566 to the host.

## Running standalone (outside Docker)

Useful for quick debugging with native Node hot-reload.

```bash
npm install

# LocalStack running and reachable at localhost:4566
# (from ecommerce-admin-infra: docker compose up -d localstack)
export ENVIRONMENT=local
export PROJECT_NAME=ecommerce-admin
export AWS_REGION=us-east-1
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export BACKEND_PORT=4000

npm run dev
```

## Environment variables

| Variable | Local | Railway (dev) | Real AWS (prod) |
|---|---|---|---|
| `ENVIRONMENT` | `local` | `dev` | `prod` |
| `PROJECT_NAME` | `ecommerce-admin` | same | same |
| `AWS_REGION` | `us-east-1` | same | your region |
| `AWS_ENDPOINT_URL` | `http://localstack:4566` | URL of the DynamoDB Local service on Railway | *(empty)* |
| `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` | `test`/`test` | `local`/`local` | real credentials / role |
| `BACKEND_PORT` | `4000` | whatever Railway assigns | depends on deployment |
| `ADMIN_API_KEY` | *(optional)* | **required** | **required** |

Table names are computed as `${PROJECT_NAME}-${ENVIRONMENT}-<Entity>`, same
as in `ecommerce-admin-infra/infrastructure/cloudformation/main.yaml` (or,
on Railway, same as what
`ecommerce-admin-infra/scripts/railway-dynamodb-init.sh` creates) — no need
to configure them separately.

## API

Every route returns JSON, sends CORS headers (including on errors), and
reports failures as `{ "error": "<message>", "details": ... }` with a
meaningful status: `400` invalid input, `401` bad/missing admin key, `404`
not found, `409` rule violation (stock, duplicates, in-use category), `500`
unexpected (details are logged server-side, never returned).

### Storefront API — public

| Method | Path | Description |
|---|---|---|
| GET | `/api/store/products` | Catalog. Query: `search`, `categoryId`, `inStock`, `featured`, `minPrice`, `maxPrice`, `limit` (1–48, default 12), `cursor`. Returns `{ items, nextCursor, hasMore }` |
| GET | `/api/store/products/:productId` | Product + its category + up to 4 related products |
| GET | `/api/store/categories` | All categories, alphabetical |
| GET, DELETE | `/api/store/cart` | View the cart (priced, with totals) / empty it |
| POST | `/api/store/cart/items` | `{ productId, quantity }` — add; an existing product's quantity is increased |
| PATCH, DELETE | `/api/store/cart/items/:productId` | `{ quantity }` — set the quantity / remove the line |
| GET, DELETE | `/api/store/wishlist` | View the wishlist / empty it |
| POST | `/api/store/wishlist/items` | `{ productId }` — add (already present is a no-op) |
| DELETE | `/api/store/wishlist/items/:productId` | Remove |

Cart and wishlist routes need an `X-Customer-Id: guest-<uuid>` header.

### Admin API — requires `Authorization: Bearer <ADMIN_API_KEY>`

| Method | Path | Description |
|---|---|---|
| GET | `/api/stats` | Dashboard counts + recently added products/users, one request |
| GET, POST | `/api/products` | List / create products |
| GET, PUT, DELETE | `/api/products/:productId` | Get / edit (also used for stock updates) / delete a product |
| GET, POST | `/api/categories` | List / create categories |
| GET, PUT, DELETE | `/api/categories/:categoryId` | Get / edit / delete a category (`409` while products still use it) |
| GET, POST | `/api/users` | List / create users |
| GET, PUT, DELETE | `/api/users/:userId` | Get / edit / delete a user (their cart and wishlist go too) |
| GET | `/api/carts` | All carts (admin overview) |
| GET, PUT, DELETE | `/api/carts/:userId` | A user's cart (`PUT` replaces the items, e.g. to remove one) |
| GET | `/api/wishlists` | All wishlists (admin overview) |
| GET, PUT, DELETE | `/api/wishlists/:userId` | A user's wishlist |

`GET /api/health` is public.

### Authentication and identity — what is and isn't protected

- **Admin routes** check a shared secret, `ADMIN_API_KEY`, compared in
  constant time. Outside `ENVIRONMENT=local` they refuse to run (`503`)
  until the key is configured, so a forgotten variable fails closed.
  There are no per-user admin accounts.
- **Customers are anonymous.** The storefront generates a `guest-<uuid>` in
  the browser and sends it as `X-Customer-Id`; it only scopes a cart and
  wishlist to one browser. It is **not authentication**: anyone who knows
  another guest's id could read that cart. There is no login, no
  cross-device carts, and no checkout/orders.
- CORS is `*` because the API is called from several origins; the admin
  key, not the origin, is what protects the admin routes.

### Business rules (enforced server-side, in [`lib/services`](lib/services))

- The price, stock and existence of a product always come from the
  database — a client-sent `price` is ignored by validation.
- Adding a product already in the cart **adds to its quantity** (one line
  per product); the resulting quantity must be `<= stock` (and `<= 99`).
- Cart/wishlist lines whose product was deleted or ran out of stock are
  returned flagged (`unavailable` / `insufficient_stock` / `out_of_stock`)
  instead of failing; `subtotal` only counts purchasable lines.
- Cart and wishlist writes are optimistic (a `version` attribute and a
  conditional write, retried), so two tabs can't overwrite each other.
- Deleting a category is refused while products reference it; creating or
  editing a product requires an existing category; creating with an id that
  already exists is a `409`, never a silent overwrite.

### Pagination and search

The catalog uses cursor pagination over DynamoDB (`nextCursor` encodes the
last product returned). Filtering by category queries the `ByCategory`
index; text search, price, stock and featured filters are applied while
paging, because DynamoDB has no full-text search. Two consequences,
documented rather than hidden: results come back in key order (not
sorted by price or date), and a very selective search reads more items
than it returns. Both are fine at this catalog size; see
[`ecommerce-admin-infra/docs/DATA_MODEL.md`](../ecommerce-admin-infra/docs/DATA_MODEL.md).

## npm scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server (hot-reload) |
| `npm run build` | Production build |
| `npm run start` | Runs the production build |
| `npm run lint` | Lint |
| `npm test` | Unit tests (Vitest) |
| `npm run seed` | Loads sample data (see [`scripts/seed.ts`](scripts/seed.ts)) |
| `npm run init-tables` | Creates the DynamoDB tables when `AWS_ENDPOINT_URL` is set (DynamoDB Local / LocalStack); idempotent, no-op against real AWS |

## Testing

- `npm test` — unit tests for the business rules (cart, wishlist, catalog
  paging/filters, validation, admin/customer auth, product/category/user
  services). Services receive their repositories as arguments, so the tests
  run against in-memory fakes that mimic DynamoDB's conditional writes and
  paging — no AWS needed.
- `scripts/test-cors.sh` — contract test against a running backend: hits
  every verb on every route, checking status codes and CORS headers, plus
  the storefront flows and the admin-key rejection. Needs seed data:

  ```bash
  BASE=http://localhost:4000 ADMIN_API_KEY=<key, if configured> ./scripts/test-cors.sh
  ```

## Structure

```
app/api/store/          Public storefront routes (catalog, cart, wishlist)
app/api/                Admin routes (one folder per resource), protected by withAdmin
lib/services/           Business rules; repositories injected (unit-tested)
lib/repositories/       One repository per table — plain DynamoDB calls, no rules
lib/validators/         Zod schemas for every input
lib/http/               CORS/JSON helper, error mapping, admin key check, request helpers
lib/aws/                DynamoDB client + config resolution
lib/errors.ts           Typed errors that map to HTTP statuses
lib/types.ts            Domain types
scripts/seed.ts         Reproducible sample data (5 categories, 15 products)
scripts/test-cors.sh    Contract test against a running backend
docker-compose.yml      Runs this service on its own (see "Running with Docker" above)
```

Request flow: `route handler → validators → service → repository → DynamoDB`.
Route handlers stay thin; rules live in the services.

## Deployment

**CI/CD**: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) has two
jobs:

- **`build`** — every push (any branch) and every pull request into `main`:
  `npm ci`, `npm run lint`, `npm test`, `npm run build`. This is what gates
  a PR; it doesn't deploy anything.
- **`deploy`** — only after `build` succeeds, and only on a push to `main`.
  Installs the Railway CLI and runs
  `railway up --service ecommerce-admin-backend --detach`, which builds the
  production image on Railway's side from [`Dockerfile.ci`](Dockerfile.ci)
  (per [`railway.json`](railway.json)) and deploys it. `--detach` means the
  workflow doesn't wait for that remote build to finish — check the Railway
  dashboard to confirm it actually went green.

Free and unlimited for this public repo, doesn't depend on the other repos
deploying at the same time.

The Railway service's **Pre-deploy command** (Settings → Deploy) is
`npm run init-tables`. It runs inside Railway's private network and creates
any missing table in DynamoDB Local, so the database never needs a public
address just to be initialised (and a restarted, empty DynamoDB Local is
repopulated with its tables on the next deploy). Against real AWS it does
nothing; CloudFormation owns those tables. [`railway.json`](railway.json)
declares the same command, but Railway did not apply it to this already-existing
service, so it was set on the service itself — check the setting if a fresh
service comes up with missing tables.

There is deliberately no Railway health check on this service: the app listens
on `BACKEND_PORT` (4000), while Railway health-checks the `PORT` it injects, so
a check would fail every deploy.

For the deploy job to work, you need:

1. A Railway project with a service for this backend (image/build via
   Dockerfile, see `railway.json`) and its environment variables configured
   (see the table above, "Railway (dev)" column — **including
   `ADMIN_API_KEY`**, without which every admin route answers `503`).
2. A Railway **Project Token** (Railway dashboard → project →
   Settings → Tokens).
3. In this repo's GitHub Settings → Secrets and variables → Actions: a
   **repository secret** named `RAILWAY_TOKEN`, value = that token.

If the Railway service name isn't `ecommerce-admin-backend`, adjust the
`--service` flag in the workflow's deploy step.

**Rolling out the admin key**: the backend and the dashboard have to move
together, and the order matters. The deployed backend from before this change
does not allow the `Authorization` header in CORS, so a new dashboard talking
to an old backend is blocked by the browser; and a new backend answers `401`
to an old dashboard, which sends no key. So: set `ADMIN_API_KEY` on Railway
first (harmless to the old code), deploy this backend, then deploy the
dashboard straight after. Expect the dashboard to be unusable for the few
minutes between the two builds.
