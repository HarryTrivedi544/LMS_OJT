# Architecture

The MVP uses a pnpm monorepo with separately deployable frontend, API, and worker apps.

Business logic belongs in `apps/api` service modules. Shared packages contain contracts, enums, configuration, and database definitions only.
