# ecommerce-admin-backend

Admin panel API (Next.js, API-only — no pages). Exposes REST endpoints for
Products, Categories, Users, Carts and Wishlists, and talks to DynamoDB
through [`lib/aws/config.ts`](lib/aws/config.ts), which resolves region,
endpoint, credentials and table names **only** from environment variables.

Part of a 3-repo project — see
[`ecommerce-admin-infra`](../ecommerce-admin-infra) for the overall
architecture, the infrastructure (CloudFormation/LocalStack), and how to
bring everything up together locally.

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

Table names are computed as `${PROJECT_NAME}-${ENVIRONMENT}-<Entity>`, same
as in `ecommerce-admin-infra/infrastructure/cloudformation/main.yaml` (or,
on Railway, same as what
`ecommerce-admin-infra/scripts/railway-dynamodb-init.sh` creates) — no need
to configure them separately.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Backend status + what it's connected to |
| GET | `/api/stats` | Dashboard counts + recently added products/users, one request |
| GET, POST | `/api/products` | List / create products |
| GET, PUT, DELETE | `/api/products/:productId` | Get / edit (also used for stock updates) / delete a product |
| GET, POST | `/api/categories` | List / create categories |
| GET, PUT, DELETE | `/api/categories/:categoryId` | Get / edit / delete a category |
| GET, POST | `/api/users` | List / create users |
| GET, PUT, DELETE | `/api/users/:userId` | Get / edit / delete a user |
| GET | `/api/carts` | All carts (admin overview) |
| GET, PUT, DELETE | `/api/carts/:userId` | A user's cart |
| GET | `/api/wishlists` | All wishlists (admin overview) |
| GET, PUT, DELETE | `/api/wishlists/:userId` | A user's wishlist |

## npm scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server (hot-reload) |
| `npm run build` | Production build |
| `npm run start` | Runs the production build |
| `npm run lint` | Lint |
| `npm run seed` | Loads sample data (see [`scripts/seed.ts`](scripts/seed.ts)) |

## Structure

```
app/api/               Route handlers (one per resource)
lib/aws/                DynamoDB client + config resolution
lib/repositories/       One repository per table
lib/http/               CORS/JSON helper shared by the routes
scripts/seed.ts         Reproducible sample data
scripts/test-cors.sh    Hits every verb on every endpoint, checks CORS headers
docker-compose.yml      Runs this service on its own (see "Running with Docker" above)
```

## Deployment

**Real CI/CD**: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) —
lint + build on every push/PR to any branch; on `main`, also deploys to
Railway (Railway builds the actual image itself from
[`Dockerfile.ci`](Dockerfile.ci), per [`railway.json`](railway.json) — the
workflow just calls `railway up`). Free and unlimited for this public
repo, doesn't depend on frontend/infra deploying at the same time.

For the deploy job to work, you need:

1. A Railway project with a service for this backend (image/build via
   Dockerfile, see `railway.json`) and its environment variables configured
   (see the table above, "Railway (dev)" column).
2. A Railway **Project Token** (Railway dashboard → project →
   Settings → Tokens).
3. In this repo's GitHub Settings → Secrets and variables → Actions: a
   **repository secret** named `RAILWAY_TOKEN`, value = that token.

If the Railway service name isn't `ecommerce-admin-backend`, adjust the
`--service` flag in the workflow's deploy step.
