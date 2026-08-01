import { MigrationInterface, QueryRunner } from 'typeorm';

// Patients booking online can now also opt into browser push (in addition to
// email/whatsapp) — needs a device-token list, same shape as users.fcmTokens.
export class PatientPushNotifications1786200000000 implements MigrationInterface {
  name = 'PatientPushNotifications1786200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN "fcmTokens" jsonb NOT NULL DEFAULT '[]'`,
    );

    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "notificationPreferences" SET DEFAULT '{"email":true,"whatsapp":true,"push":true}'`,
    );

    await queryRunner.query(
      `UPDATE "patients" SET "notificationPreferences" = "notificationPreferences" || '{"push":true}'::jsonb WHERE NOT ("notificationPreferences" ? 'push')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "notificationPreferences" SET DEFAULT '{"email":true,"whatsapp":true}'`,
    );
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "fcmTokens"`);
  }
}
