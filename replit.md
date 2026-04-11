# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, `drizzle-zod`
- **Build**: esbuild (CJS bundle)

## Artifacts

### libremercado (PachaPay Marketplace)
- **Kind**: React + Vite frontend, mounted at `/`
- **Dir**: `artifacts/libremercado/`
- Source: cloned from GitHub `Dany76162/libremercado`, branch `dev-libre`
- Features: marketplace, shopping cart, user auth, merchant panel, rider onboarding, Stripe payments, video feed (Reelmark), travel offers, location filtering, admin panel, KYC verification, real-time order tracking via WebSocket

### API Server
- **Kind**: Express API backend, mounted at `/api`
- **Dir**: `artifacts/api-server/`
- All marketplace routes registered via `registerRoutes()` in `src/routes/libremercado.ts`
- WebSocket server runs on `/ws`
- Session auth with `express-session`
- File uploads with multer → `/uploads`
- Stripe integration via connector API

### mockup-sandbox (Canvas)
- **Kind**: design, mounted at `/__mockup`
- **Dir**: `artifacts/mockup-sandbox/`

## Shared Libraries

- `lib/db/` — PostgreSQL + Drizzle ORM. Schema at `lib/db/src/schema/libremercado.ts`
- `lib/api-client-react/` — Generated React Query hooks from OpenAPI spec
- `lib/api-spec/` — OpenAPI spec source

## Frontend Aliases

The `libremercado` vite.config.ts defines:
- `@` → `artifacts/libremercado/src/`
- `@shared` → `artifacts/libremercado/shared/` (standalone TS types for frontend)
- `@assets` → `attached_assets/`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/libremercado run dev` — run frontend locally

## Environment Variables / Secrets

- `SESSION_SECRET` — required for express-session (already set)
- `DATABASE_URL` — set automatically by Replit database
- `AI_INTEGRATIONS_OPENAI_API_KEY` — for AI content generation (optional)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — for AI content generation (optional)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
