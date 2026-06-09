# LMS OJT

OJT LMS and performance tracking MVP.

## Workspace

This repository uses a pnpm monorepo with separately deployable apps and shared packages.

```text
apps/web       Next.js frontend
apps/api       Express API backend
apps/worker    BullMQ background worker
packages/db    Drizzle schema, migrations, and database config
packages/shared
packages/api-contracts
packages/config
infra/          local Docker infrastructure
```

## Local Development

```powershell
pnpm install
pnpm infra:up
pnpm db:migrate
pnpm db:seed:super-admin
pnpm dev
```

Copy `.env.example` to `.env` for local development and replace placeholders as needed.

Default local Super Admin seed credentials are documented in `.env.example`.

```text
Email: admin@example.com
Password: ChangeMe123!
```
