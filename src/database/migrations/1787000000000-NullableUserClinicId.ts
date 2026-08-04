import { MigrationInterface, QueryRunner } from 'typeorm';

// Super-admin accounts aren't tied to any single clinic, so `users.clinicId`
// must allow NULL to represent a platform-wide account.
export class NullableUserClinicId1787000000000 implements MigrationInterface {
  name = 'NullableUserClinicId1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "clinicId" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "clinicId" SET NOT NULL`,
    );
  }
}
