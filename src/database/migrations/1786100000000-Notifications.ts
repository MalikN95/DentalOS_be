import { MigrationInterface, QueryRunner } from 'typeorm';

// Adds per-patient/per-staff notification channel preferences, a device-token
// list for web push (FCM), and an in-app notification inbox table.
export class Notifications1786100000000 implements MigrationInterface {
  name = 'Notifications1786100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN "notificationPreferences" jsonb NOT NULL DEFAULT '{"email":true,"whatsapp":true}'`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "notificationPreferences" jsonb NOT NULL DEFAULT '{"email":true,"whatsapp":true,"push":true,"inApp":true}'`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "fcmTokens" jsonb NOT NULL DEFAULT '[]'`,
    );

    await queryRunner.query(
      `CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "clinicId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "body" character varying NOT NULL,
        "isRead" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_clinic" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_created" ON "notifications" ("userId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "fcmTokens"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "notificationPreferences"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN "notificationPreferences"`,
    );
  }
}
