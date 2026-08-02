import { MigrationInterface, QueryRunner } from 'typeorm';

// Owner/admin "new review" alerts are filtered by rating (default: only
// ratings <= 3, so 5-star reviews don't spam the inbox) — needs a numeric
// field alongside the existing per-channel toggles on users.notificationPreferences.
export class ReviewAlertRating1786300000000 implements MigrationInterface {
  name = 'ReviewAlertRating1786300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "notificationPreferences" SET DEFAULT '{"email":true,"whatsapp":true,"push":true,"inApp":true,"reviewAlertMaxRating":3}'`,
    );

    await queryRunner.query(
      `UPDATE "users" SET "notificationPreferences" = "notificationPreferences" || '{"reviewAlertMaxRating":3}'::jsonb WHERE NOT ("notificationPreferences" ? 'reviewAlertMaxRating')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "notificationPreferences" SET DEFAULT '{"email":true,"whatsapp":true,"push":true,"inApp":true}'`,
    );
  }
}
