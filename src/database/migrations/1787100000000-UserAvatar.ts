import { MigrationInterface, QueryRunner } from 'typeorm';

// S3 object key for the staff member's own profile photo (same
// upload-URL/key pattern as ClinicEntity.logoKey) — null until they upload one.
export class UserAvatar1787100000000 implements MigrationInterface {
  name = 'UserAvatar1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "avatarKey" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatarKey"`);
  }
}
