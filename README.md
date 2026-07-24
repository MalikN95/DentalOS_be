# DentalOS Backend

Dental Practice Management System (DPMS) API.

## Stack

- NestJS 11, TypeScript (strict)
- PostgreSQL + TypeORM (migrations only, no synchronize)
- WebSocket (socket.io) — real-time events per clinic
- S3 (AWS SDK v3, any S3-compatible storage) — presigned upload/download
- Swagger — `/api/docs`
- JWT access + refresh tokens with rotation (single-use refresh, jti stored in DB)
- Multi-tenancy: clinic resolved from subdomain (`{clinic}.APP_DOMAIN`), `clinicId` in every entity and in JWT payload
- Audit log for medical data changes
- Health checks (`/api/health`, Terminus) + graceful shutdown

## Requirements

- Node.js 22+
- PostgreSQL 16+ (via `docker compose up -d` from the repo root)
- Any S3-compatible storage (AWS S3, Cloudflare R2, MinIO, ...)

## Getting started

```bash
# 0. Start PostgreSQL (from the workspace root, one level up)
docker compose up -d

# 1. Install dependencies
npm ci

# 2. Configure environment
cp .env.example .env
# edit .env — set JWT secrets (openssl rand -hex 32), DB/S3 credentials

# 3. Run migrations
npm run migration:run

# 4. Seed default clinic + admin, staff and patients
npm run seed
# (or set SEED_ON_START=true in .env to seed automatically on every app start)

# 5. Start
npm run start:dev
```

API: `http://localhost:4000/api`
Swagger UI: `http://localhost:4000/api/docs`
OpenAPI JSON: `http://localhost:4000/api/docs-json` (used by frontend codegen)

## Docker

```bash
docker build -t dentalos-be .
docker run --env-file .env -p 4000:4000 dentalos-be
```

In production migrations run automatically at startup (`migrationsRun: true`).

## Scripts

| Script | Description |
| --- | --- |
| `npm run start:dev` | Dev server with watch |
| `npm run build` | Production build |
| `npm run lint` | ESLint with autofix |
| `npm run test` | Unit tests |
| `npm run migration:generate -- src/database/migrations/Init` | Generate migration from entity diff |
| `npm run migration:run` | Apply migrations |
| `npm run migration:revert` | Revert last migration |
| `npm run seed` | Seed default clinic + admin, staff (owner/doctors/receptionist/assistant) and patients (idempotent) |

## Seeding

`npm run seed` populates a demo tenant via the shared seeders in `src/database/seeds/` (`seed-clinic`, `seed-admin`, `seed-staff`, `seed-patients`). All seeders are idempotent — reruns never duplicate rows.

The same seeders run automatically on application boot when `SEED_ON_START=true` (see `SeedModule` → `SeedService.onApplicationBootstrap`). Handy for a fresh Docker/dev database.

Credentials and demo data are configured via `SEED_*` env vars (see `.env.example`): admin (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`), staff (`SEED_STAFF_PASSWORD`, e.g. `owner@maximum.local`, `ivanov@maximum.local`), and 4 sample patients.

## Project structure

```
src/
  common/         # decorators, guards, shared types
  config/         # env validation (Joi), TypeORM options
  database/       # CLI data-source, migrations
  entities/       # all TypeORM entities (clinic, branch, cabinet, equipment, user, audit-log)
  modules/
    auth/         # login, refresh (rotation), logout
    users/        # users per clinic
    clinics/      # clinic settings, branches, cabinets, equipment
    audit/        # audit log (global)
    events/       # WebSocket gateway (global)
    storage/      # S3 presigned URLs (global)
    health/       # /api/health
```

## Multi-tenancy

- Each clinic has a unique `subdomain` (`ClinicEntity.subdomain`), users open `{subdomain}.APP_DOMAIN`.
- `TenantMiddleware` resolves the clinic from the `Host` header on every request and attaches it to the request. In dev (`APP_DOMAIN=localhost`) pass the `X-Clinic-Subdomain: <subdomain>` header instead.
- Login is scoped to the resolved clinic: the same email may exist in different clinics.
- The issued JWT contains `clinicId`. The global `TenantGuard` rejects requests where the token's `clinicId` does not match the clinic resolved from the subdomain (403).
- Use `@CurrentClinic()` in controllers to get the resolved `ClinicEntity`.

## Auth flow

1. `POST /api/auth/login` (on the clinic's subdomain) → `{ accessToken, refreshToken }`
2. Access token (15m) in `Authorization: Bearer <token>`
3. `POST /api/auth/refresh` with refresh token → new pair; old refresh token is invalidated (rotation, reuse detection)
4. `POST /api/auth/logout` revokes the refresh token

All routes are protected by default (global guard); public routes are marked with `@Public()`. Role checks via `@Roles(UserRole.DOCTOR)`.

## Linting

ESLint 9 (flat config) with Airbnb style guide via `eslint-config-airbnb-extended` (base + node + typescript) plus `typescript-eslint` type-checked rules, Prettier applied last. NestJS/TypeORM-specific overrides: entity import cycles allowed, `prefer-default-export` off, `void promise` statements allowed.

## Pre-commit

Husky + lint-staged (ESLint + Prettier on staged files) + commitlint (conventional commits).
