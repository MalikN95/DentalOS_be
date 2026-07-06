import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserRefreshJti1783359372224 implements MigrationInterface {
  name = 'UserRefreshJti1783359372224';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "refreshJti" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refreshJti"`);
  }
}
