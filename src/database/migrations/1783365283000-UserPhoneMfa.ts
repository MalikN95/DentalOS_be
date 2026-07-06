import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserPhoneMfa1783365283000 implements MigrationInterface {
  name = 'UserPhoneMfa1783365283000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "phone" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "mfaEnabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "mfaSecret" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'owner'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'accountant'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'patient'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "passwordHash" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "mfaSecret"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "mfaEnabled"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
    // PostgreSQL does not support removing enum values without recreating the type
  }
}
