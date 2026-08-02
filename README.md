# DentalOS Backend

Dental Practice Management System (DPMS) API.

## Stack

- NestJS 11, TypeScript (strict)
- PostgreSQL + TypeORM (migrations only, no synchronize)
- WebSocket (socket.io) — real-time events per clinic
- S3 (AWS SDK v3, any S3-compatible storage) — presigned upload/download
- Swagger — `/api/docs`
- JWT access + refresh tokens with rotation (single-use refresh, jti stored in DB)
- Multi-tenancy: no per-clinic subdomain — clinic resolved from the JWT (`clinicId`) once authenticated, or from a `:clinicSlug` path param for the public booking widget; `clinicId` in every entity and in the JWT payload
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

There is no per-clinic subdomain — every clinic's staff/owner/admin logs into the same single kabinet host, and each clinic has a unique `slug` (`ClinicEntity.slug`, renamed from the old `subdomain` column) used only as a path segment for the public booking widget (`/api/booking/:clinicSlug/...`).

- The global `TenantGuard` (`common/guards/tenant.guard.ts`) resolves `request.clinic` — the only thing `@CurrentClinic()` reads — one of two ways:
  - **Authenticated requests**: from the JWT's `clinicId` (`clinicsService.findById`). No header, no URL segment needed.
  - **Public requests with a `:clinicSlug` route param** (the booking widget): from `clinicsService.findBySlug(slug)`.
  - Everything else (e.g. `POST /auth/login`, before a user is known) leaves `request.clinic` unresolved; `@CurrentClinic()` throws if a controller tries to use it anyway.
- Login has no clinic context at all: `POST /api/auth/login` takes just `{ email, password }`. Staff/owner/admin email is enforced **globally unique** (partial unique index `UQ_users_email_non_patient` on `users.email` **where** `role != 'patient'`), so the account — and its clinic — is resolved from the email alone. Patient accounts (booking-widget social login) stay clinic-scoped via the pre-existing `(clinicId, email)` composite unique index — the same person may legitimately have separate patient records at unrelated clinics.
- `StaffService` enforces the same global uniqueness at the application layer (`assertEmailFreeElsewhere`) so a conflict returns a clean `409` instead of a raw DB constraint error.
- Use `@CurrentClinic()` in controllers to get the resolved `ClinicEntity`.

## Auth flow

1. `POST /api/auth/login` (email + password, no clinic context) → `{ accessToken, refreshToken }`
2. Access token (15m) in `Authorization: Bearer <token>`
3. `POST /api/auth/refresh` with refresh token → new pair; old refresh token is invalidated (rotation, reuse detection)
4. `POST /api/auth/logout` revokes the refresh token

All routes are protected by default (global guard); public routes are marked with `@Public()`. Role checks via `@Roles(UserRole.DOCTOR)`.

## Notifications

`src/modules/notifications/` is a channel-agnostic dispatcher (`NotificationsService.send(channel, message)`), `@Global()` so any module can inject it. Six channels exist on the `NotificationChannel` enum (`sms`, `email`, `push`, `telegram`, `whatsapp`, `in_app`); each has a `NotificationSender` implementation registered in `notifications.module.ts#createSenders`:

- **Email** (`senders/mail.sender.ts`) — wraps `MailService`, real SMTP via nodemailer.
- **WhatsApp** (`senders/whatsapp.sender.ts`) — Meta WhatsApp Cloud API, plain HTTPS `fetch`. Needs `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` (see `.env.example`); no-ops with a logged warning until set. Free-form text only delivers inside the 24h customer-service window — proactive reminders outside that window need a pre-approved message template instead (not yet implemented; ask if you hit this).
- **Push** (`senders/fcm.sender.ts`) — Firebase Cloud Messaging via `firebase-admin`. Needs `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (service account credentials, from Firebase Console → Project Settings → Service Accounts); no-ops until set. `message.to` is a device token — see `users.fcmTokens` below.
- **In-app** (`senders/in-app.sender.ts`) — writes a row to the `notifications` table (`NotificationEntity`); this is what the kabinet's bell reads. `message.to` is a `userId`, and `message.clinicId` must be set (the only channel where the generic `NotificationMessage` shape needs that extra field).
- **SMS / Telegram** — still `LogSender` placeholders (log only), unchanged from before.

**Per-person channel preferences** (this is what the patient/staff card checkboxes write):
- `PatientEntity.notificationPreferences` (`{ email, whatsapp, push }`, `push` optional/staff-form-invisible — see below) — gates appointment reminders (`ReminderProcessorService#hasConsent`), review requests, and booking confirmations.
- `UserEntity.notificationPreferences` (`{ email, whatsapp, push, inApp, reviewAlertMaxRating }`, default all channels `true`, `reviewAlertMaxRating: 3`) — gates every staff-facing event below. `reviewAlertMaxRating` is owner/admin-only: they're alerted about a new review only when its rating is at or below this value (doctors are always notified of reviews about them, unfiltered).
- `UserEntity.fcmTokens` (`string[]`) — a user's registered web-push device tokens (a browser tab registers one via `POST /notifications/push-subscriptions` after the user grants permission). Multiple tokens per user are normal (several browsers/devices).

**Notification events** (helpers in `src/common/helpers/find-clinic-admins.helper.ts` and `NotificationsService#notifyStaffMember(s)`/`notifyPatient` fan out per-recipient channel prefs automatically):
- Online booking created → assigned doctor (`BookingService#notifyAssignedDoctor`) + clinic admins (`#notifyClinicAdmins`); the patient gets a transactional SMS/email/push confirmation regardless of preferences (`#sendConfirmation`).
- Appointment arrived → doctor. Cancelled → patient + doctor + admins. Rescheduled → patient + doctor. (`AppointmentsService#notifyStatusChange`/`#notifyRescheduled`)
- Invoice issued / payment received → patient. (`InvoicesService#create`, `PaymentsService#create`)
- New review → doctor (always) + admins (rating-filtered by `reviewAlertMaxRating`). (`ReviewsService#notifyNewReview`)
- Attempt to delete/deactivate the clinic's last active owner → all admins/owners, and the action is blocked. (`StaffService#assertNotLastOwner`)
- Appointment reminders (24h/2h before, per `ReminderSettingEntity`) → patient. (`ReminderProcessorService`)

**Message language follows the clinic's own language setting**, not a hardcoded default: `src/common/notifications/notification-copy.ts` holds ru/en/ky copy for every event above (subject + body, matching the frontend's own ru/en/ky dictionaries), and `src/common/notifications/notification-locale.ts#resolveClinicNotificationLocale` looks up `ClinicEntity.language` (falls back to `en`, the column's own default, for an unrecognized value) to pick which one to use — including the `Intl` locale tag (`NOTIFICATION_LOCALE_INTL_TAG`) used to format dates/times in the message body. A clinic changes its language from the Settings page; every notification sent afterward picks it up automatically, no restart needed.

**In-app inbox API** (`notifications.controller.ts`, all under `/api/notifications`, authenticated):
- `GET /` — paginated list for the current user (`?page&limit&unreadOnly`), includes `unreadCount`.
- `PATCH /:id/read`, `PATCH /read-all` — mark as read.
- `POST /push-subscriptions`, `DELETE /push-subscriptions` — register/unregister an FCM device token (body: `{ token }`).

Adding a new notification event elsewhere: inject `NotificationsService` (and, for the recipient's clinic, `Repository<ClinicEntity>` to resolve locale via `resolveClinicNotificationLocale`), write a ru/en/ky copy builder in `notification-copy.ts`, then `notifyStaffMember(s)`/`notifyPatient`/`send()` with its result — those helpers already read the recipient's own `notificationPreferences` per channel.

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
