import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientNotes1785400000000 implements MigrationInterface {
  name = 'PatientNotes1785400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "patient_notes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "patientId" uuid NOT NULL, "authorUserId" uuid NOT NULL, "text" text NOT NULL, CONSTRAINT "PK_patient_notes_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_patient_notes_patientId" ON "patient_notes" ("patientId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_notes" ADD CONSTRAINT "FK_patient_notes_patientId" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_notes" ADD CONSTRAINT "FK_patient_notes_authorUserId" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "patient_notes"`);
  }
}
