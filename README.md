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
| `npm run seed` | Seed clinic, admin, branches, staff, patients, services, cabinets, appointments, invoices/payments and leads (idempotent) |

## Seeding

`npm run seed` populates a demo tenant via the shared seeders in `src/database/seeds/`, run in order: `seed-clinic` → `seed-admin` → `seed-branches` → `seed-staff` → `seed-patients` → `seed-random-patients` → `seed-services` → `seed-cabinets` → `seed-appointments` → `seed-invoices` → `seed-leads`. All seeders are idempotent — reruns never duplicate rows.

The same seeders run automatically on application boot when `SEED_ON_START=true` (see `SeedModule` → `SeedService.onApplicationBootstrap`). Handy for a fresh Docker/dev database.

Credentials and demo data are configured via `SEED_*` env vars (see `.env.example`): admin (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`), staff (`SEED_STAFF_PASSWORD`, e.g. `owner@maximum.local`, `ivanov@maximum.local`), and sample patients.

`seed-branches` creates two branches (`Центральный`, `Филиал на Ленинском`) with working hours; `seed-staff` attaches the seeded doctor profiles to them by branch name and backfills the branch on profiles that were seeded before branches existed.

`seed-random-patients` adds ~24 backdated patients (on top of the 4 curated ones from `seed-patients`) so patient volume and "new patients" stats look real. `seed-services`/`seed-cabinets` create demo service categories, services and per-branch cabinets. `seed-appointments` generates a random spread of appointments (past 14 days, today, next 6 days) across every active doctor, patient, service and cabinet, with statuses picked realistically for the day/time (today's slot always gets appointments even if it lands on a Sunday, so the appointments screen is never empty). `seed-invoices` creates a paid invoice + payment (and occasionally a refund) for every completed appointment, so the `/analytics/revenue` endpoint has real numbers. `seed-leads` creates a spread of CRM leads across funnel stages for `/analytics/conversion`.

Coarse idempotency note: `seed-appointments`/`seed-leads` skip entirely if the clinic already has any rows, so re-running the seed weeks later won't refresh "today" — truncate `appointments`/`invoices`/`payments`/`refunds`/`leads` first if you need a fresh spread.

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
    staff/        # employees CRUD (/api/staff) incl. the doctor profile
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

## Staff API (`/api/staff`)

Clinic employees = clinic users whose role is one of `owner | admin | doctor | receptionist | assistant | accountant` (`STAFF_ROLES`); patients and platform super-admins are never listed.

| Method | Route | Roles | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/staff` | any authenticated | Paginated (`page`, `limit`), `search` (name/email/phone, ILIKE), `role`, `isActive` |
| `GET` | `/api/staff/:id` | any authenticated | |
| `POST` | `/api/staff` | owner, admin | Creates the user with a bcrypt password; a `doctor` block creates the doctor profile |
| `PATCH` | `/api/staff/:id` | owner, admin | Every field optional; an omitted `password` keeps the current credentials |
| `DELETE` | `/api/staff/:id` | owner, admin | Soft-deletes the user and their doctor profile |

Behaviour worth knowing:

- The `doctor` block (branch, specializations, education, experience, description) is applied only when the role is `doctor`. Changing a doctor's role to anything else soft-deletes the doctor profile; changing it back re-creates (or restores) it.
- `branchId` is validated against the clinic; `null` detaches the doctor from any branch.
- The `(clinicId, email)` unique index also covers soft-deleted rows, so creating an employee with the email of a removed one **restores** that record instead of failing.
- Guards: you cannot delete your own account, and the clinic always keeps at least one active owner (blocks deleting, deactivating or demoting the last one).
- `passwordHash`, `mfaSecret` and `refreshJti` are `select: false` and never leave the API; updates use an explicit column patch so they are not clobbered.

## Linting

ESLint 9 (flat config) with Airbnb style guide via `eslint-config-airbnb-extended` (base + node + typescript) plus `typescript-eslint` type-checked rules, Prettier applied last. NestJS/TypeORM-specific overrides: entity import cycles allowed, `prefer-default-export` off, `void promise` statements allowed.

## Pre-commit

Husky runs `npm run build` (`nest build`) on `pre-commit` — that is the only check. ESLint, Prettier and the commit-message format are **not** enforced on commit; run `npm run lint` / `npm run format` manually. There is no `commit-msg` hook (commitlint was removed), so commit messages are free-form.
