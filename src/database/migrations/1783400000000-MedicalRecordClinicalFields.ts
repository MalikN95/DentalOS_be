import { MigrationInterface, QueryRunner } from 'typeorm';

export class MedicalRecordClinicalFields1783400000000 implements MigrationInterface {
  name = 'MedicalRecordClinicalFields1783400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "medical_records" ADD "complaints" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_records" ADD "examination" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_records" ADD "prescriptions" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_records" ADD "recommendations" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "medical_records" DROP COLUMN "recommendations"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_records" DROP COLUMN "prescriptions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_records" DROP COLUMN "examination"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_records" DROP COLUMN "complaints"`,
    );
  }
}
