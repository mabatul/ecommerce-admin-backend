# ecommerce-admin-backend

Admin panel API (Next.js, API-only — no pages). Exposes REST endpoints for
Products, Categories, Users, Carts and Wishlists, and talks to DynamoDB
through [`lib/aws/config.ts`](lib/aws/config.ts), which resolves region,
endpoint, credentials and table names **only** from environment variables.

Part of a 3-repo project — see
[`ecommerce-admin-infra`](../ecommerce-admin-infra) for the overall
architecture, the infrastructure (CloudFormation/LocalStack), and how to
bring everything up together locally.

## Running inside the full local environment (recommended)

This repo doesn't stand on its own — it needs the infrastructure
(LocalStack) and, to see it working end to end, the frontend. From
`ecommerce-admin-infra` (cloned as a sibling folder of this repo):

```bash
docker compose up
```

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
| GET, POST | `/api/products` | List / create products |
| GET, DELETE | `/api/products/:productId` | Get / delete a product |
| GET, POST | `/api/categories` | List / create categories |
| GET, POST | `/api/users` | List / create users |
| GET, PUT, DELETE | `/api/carts/:userId` | A user's cart |
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
app/api/            Route handlers (one per resource)
lib/aws/             DynamoDB client + config resolution
lib/repositories/    One repository per table
lib/http/            CORS/JSON helper shared by the routes
scripts/seed.ts      Reproducible sample data
```

## Deployment

[`Jenkinsfile`](Jenkinsfile): lint, build, Docker image build (uses
[`Dockerfile.ci`](Dockerfile.ci) — see [`railway.json`](railway.json)) and
deploy to Railway. Runs as an independent Jenkins job (see
`ecommerce-admin-infra/jenkins/README.md`) — doesn't depend on
frontend/infra deploying in the same pipeline or at the same time.

For the deploy stage to work, you need:

1. A Railway project with a service for this backend (image/build via
   Dockerfile, see `railway.json`) and its environment variables configured
   (see the table above, "Railway (dev)" column).
2. A Railway **Project Token** (Railway dashboard → project →
   Settings → Tokens).
3. In Jenkins: a **Secret text** credential, id `railway-token-backend`,
   value = that token.

If the Railway service name isn't `ecommerce-admin-backend`, adjust
`RAILWAY_SERVICE` in the `Jenkinsfile`.
