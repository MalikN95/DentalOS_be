import { MigrationInterface, QueryRunner } from 'typeorm';

// otp_codes (OtpCodeEntity) previously only existed via DB_SYNC in dev —
// never migrated (same gap doctor_schedules/reviews/doctor_services had
// before their first real migrations) — needed now that SmsAuthController
// is actually wired up and reachable (patient portal WhatsApp login).
//
// Some dev databases already have this table (created earlier by a
// DB_SYNC=true run, before it had its own migration) — so `up` checks for
// that instead of assuming a bare CREATE TABLE always applies, and only
// backfills whatever's actually missing (namely `devPlainCode`, added after
// the table already existed here).
export class OtpCodes1786800000000 implements MigrationInterface {
  name = 'OtpCodes1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('otp_codes');

    if (!hasTable) {
      await queryRunner.query(
        `CREATE TYPE "public"."otp_codes_purpose_enum" AS ENUM('sms_login', 'email_verification', 'mfa')`,
      );

      await queryRunner.query(
        `CREATE TABLE "otp_codes" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "deletedAt" TIMESTAMP WITH TIME ZONE,
          "clinicId" uuid NOT NULL,
          "destination" character varying NOT NULL,
          "purpose" "public"."otp_codes_purpose_enum" NOT NULL,
          "codeHash" character varying NOT NULL,
          "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
          "attempts" integer NOT NULL DEFAULT 0,
          "isUsed" boolean NOT NULL DEFAULT false,
          "devPlainCode" character varying,
          CONSTRAINT "PK_otp_codes" PRIMARY KEY ("id")
        )`,
      );

      await queryRunner.query(
        `CREATE INDEX "IDX_otp_codes_destination_purpose" ON "otp_codes" ("destination", "purpose")`,
      );
      return;
    }

    const hasDevPlainCode = await queryRunner.hasColumn(
      'otp_codes',
      'devPlainCode',
    );

    if (!hasDevPlainCode) {
      await queryRunner.query(
        `ALTER TABLE "otp_codes" ADD "devPlainCode" character varying`,
      );
    }

    const hasIndex = (await queryRunner.query(
      `SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_otp_codes_destination_purpose'`,
    )) as unknown[];

    if (hasIndex.length === 0) {
      await queryRunner.query(
        `CREATE INDEX "IDX_otp_codes_destination_purpose" ON "otp_codes" ("destination", "purpose")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only ever drop the column this migration is responsible for — never
    // the table/type/index, which may have pre-existed independently of it
    // (see the up() branch above).
    const hasDevPlainCode = await queryRunner.hasColumn(
      'otp_codes',
      'devPlainCode',
    );

    if (hasDevPlainCode) {
      await queryRunner.query(
        `ALTER TABLE "otp_codes" DROP COLUMN "devPlainCode"`,
      );
    }
  }
}
