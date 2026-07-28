import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientFileDocumentMeta1785267608021 implements MigrationInterface {
  name = 'PatientFileDocumentMeta1785267608021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."patient_files_documenttype_enum" AS ENUM('contract', 'consent', 'certificate', 'id', 'insurance', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_files" ADD "documentType" "public"."patient_files_documenttype_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "patient_files" ADD "note" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "patient_files" DROP COLUMN "note"`);
    await queryRunner.query(
      `ALTER TABLE "patient_files" DROP COLUMN "documentType"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."patient_files_documenttype_enum"`,
    );
  }
}
