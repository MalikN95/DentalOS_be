import { MigrationInterface, QueryRunner } from 'typeorm';

export class ToothMarkOtherCondition1783500000000 implements MigrationInterface {
  name = 'ToothMarkOtherCondition1783500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Postgres enums can only gain values, never lose them inside a transaction
    // in older versions — safe as a standalone statement either way.
    await queryRunner.query(
      `ALTER TYPE "tooth_marks_condition_enum" ADD VALUE IF NOT EXISTS 'other'`,
    );
  }

  public async down(): Promise<void> {
    // Removing an enum value requires rebuilding the type; not worth it for a rollback.
  }
}
