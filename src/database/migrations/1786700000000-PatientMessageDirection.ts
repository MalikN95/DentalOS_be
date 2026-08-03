import { MigrationInterface, QueryRunner } from 'typeorm';

// Adds `direction` to patient_messages (outbound clinic->patient sends vs
// inbound patient-portal replies) and a `portal` channel for those replies,
// so the patient portal and the staff Chats page share one timeline.
export class PatientMessageDirection1786700000000 implements MigrationInterface {
  name = 'PatientMessageDirection1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."patient_messages_channel_enum" ADD VALUE 'portal'`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."patient_messages_direction_enum" AS ENUM('outbound', 'inbound')`,
    );

    await queryRunner.query(
      `ALTER TABLE "patient_messages" ADD "direction" "public"."patient_messages_direction_enum" NOT NULL DEFAULT 'outbound'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patient_messages" DROP COLUMN "direction"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."patient_messages_direction_enum"`,
    );

    // Postgres can't remove a value from an enum type in place; rebuild it
    // without 'portal' (safe here — the column default rollback above already
    // drops the only column that referenced it as a value).
    await queryRunner.query(
      `ALTER TYPE "public"."patient_messages_channel_enum" RENAME TO "patient_messages_channel_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."patient_messages_channel_enum" AS ENUM('email', 'whatsapp')`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_messages" ALTER COLUMN "channel" TYPE "public"."patient_messages_channel_enum" USING "channel"::text::"public"."patient_messages_channel_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."patient_messages_channel_enum_old"`,
    );
  }
}
