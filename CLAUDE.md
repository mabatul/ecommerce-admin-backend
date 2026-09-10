# CLAUDE.md

Context for Claude Code (or any AI assistant) working in this repo.

## What this repo is

`ecommerce-admin-backend` is one of **three independent repos** that make
up the ecommerce-admin project:

- **ecommerce-admin-infra** — infrastructure only (CloudFormation,
  LocalStack, deployment scripts, local Jenkins). Its `docker-compose.yml`
  brings up LocalStack only, nothing else. Lives in a sibling folder,
  `../ecommerce-admin-infra`.
- **ecommerce-admin-backend** (this repo) — the Next.js API. Has its own
  `docker-compose.yml` and starts independently.
- **ecommerce-admin-frontend** — the Next.js dashboard, consumes this
  backend's API over HTTP. Also starts independently, with its own
  `docker-compose.yml`.

This repo needs infra's LocalStack (or DynamoDB Local on Railway, or real
AWS) reachable via `AWS_ENDPOINT_URL` — but it does **not** depend on
`ecommerce-admin-infra`'s `docker-compose.yml` to build or start it.
`docker-compose.yml` (this repo) reaches LocalStack over the host via
`host.docker.internal:4566`, since LocalStack already publishes that port.
Bring infra up first (separately), then this repo, then frontend — see
`ecommerce-admin-infra/README.md` for the full sequence.

## Key design decisions (don't undo these without a reason)

- **This repo starts independently, on purpose.** `docker-compose.yml`
  here only defines the `backend` service — it never references or builds
  infra/frontend. Don't merge it back into a shared compose file at the
  infra repo; that coupling is exactly what the 3-repo split was meant to
  remove.
- **`lib/aws/config.ts` is the only place that knows about environments.**
  Region, endpoint, credentials and table names are resolved purely from
  env vars (`AWS_ENDPOINT_URL`, `ENVIRONMENT`, `PROJECT_NAME`,
  `AWS_REGION`). No repository, route, or script should branch on
  "are we local/dev/prod" itself — it should just read config from there.
- **Table names are computed, never hardcoded**: `${PROJECT_NAME}-${ENVIRONMENT}-<Entity>`,
  matching `ecommerce-admin-infra/infrastructure/cloudformation/main.yaml`
  and `ecommerce-admin-infra/scripts/railway-dynamodb-init.sh`.
- **Two Dockerfiles, different jobs.** `Dockerfile` runs `next dev` over a
  bind-mounted source tree (used by `ecommerce-admin-infra/docker-compose.yml`
  for local dev). `Dockerfile.ci` builds a production image with the code
  baked in via `COPY` (used by CI and by Railway, see `railway.json`) —
  it also bakes in `lib/`, `scripts/`, and `tsconfig.json` so `npm run seed`
  works at runtime via `tsx`, not just the compiled `.next` output.
- **This repo deploys independently.** Its `Jenkinsfile` builds, lints, and
  deploys to Railway on its own — it doesn't wait for or depend on
  infra/frontend's pipelines.

## Conventions across all three repos

- Documentation (README, code comments): **English**, even though
  conversations about this project may happen in Spanish.
- Commit messages: plain-language summaries of what changed (not
  Conventional Commits prefixes like `feat:`/`chore:`).
- Don't fabricate commit timestamps/history to make automated work look
  like it happened incrementally over time it didn't.

## Where to look for more detail

- `README.md` — how to run standalone or as part of the full environment,
  environment variables table, endpoint reference, deployment.
- `ecommerce-admin-infra/README.md` — overall architecture, all 3 repos.
- `ecommerce-admin-infra/docs/RAILWAY.md` — how `dev` (Railway) resolves DynamoDB.
