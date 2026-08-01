import { MigrationInterface, QueryRunner } from 'typeorm';

// Clinics are no longer addressed by a per-clinic subdomain — the cabinet lives
// at a single fixed host and the public booking widget is addressed by path
// (`/book/{slug}`). The column is renamed (not dropped) since it's already a
// unique, URL-safe identifier that fits the new role perfectly.
export class RemoveClinicSubdomain1786000000000 implements MigrationInterface {
  name = 'RemoveClinicSubdomain1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clinics" RENAME COLUMN "subdomain" TO "slug"`,
    );

    // Login no longer has a clinic-subdomain to disambiguate accounts, so
    // staff/owner/admin emails must be unique across the whole system.
    // Patient accounts (booking-widget social login) stay clinic-scoped —
    // the same person may legitimately have separate patient records at
    // unrelated clinics.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_email_non_patient" ON "users" ("email") WHERE "role" != 'patient'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_users_email_non_patient"`);
    await queryRunner.query(
      `ALTER TABLE "clinics" RENAME COLUMN "slug" TO "subdomain"`,
    );
  }
}
