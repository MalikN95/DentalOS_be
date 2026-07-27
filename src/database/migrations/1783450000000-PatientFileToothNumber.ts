import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientFileToothNumber1783450000000 implements MigrationInterface {
  name = 'PatientFileToothNumber1783450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patient_files" ADD "toothNumber" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patient_files" DROP COLUMN "toothNumber"`,
    );
  }
}
