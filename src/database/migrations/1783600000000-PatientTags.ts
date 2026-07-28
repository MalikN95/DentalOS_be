import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientTags1783600000000 implements MigrationInterface {
  name = 'PatientTags1783600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "patient_tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "clinicId" uuid NOT NULL, "name" character varying NOT NULL, "color" integer, CONSTRAINT "PK_patient_tags_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_patient_tags_clinicId" ON "patient_tags" ("clinicId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_tags" ADD CONSTRAINT "FK_patient_tags_clinicId" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "patient_tag_assignments" ("patientId" uuid NOT NULL, "tagId" uuid NOT NULL, CONSTRAINT "PK_patient_tag_assignments" PRIMARY KEY ("patientId", "tagId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_patient_tag_assignments_patientId" ON "patient_tag_assignments" ("patientId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_patient_tag_assignments_tagId" ON "patient_tag_assignments" ("tagId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_tag_assignments" ADD CONSTRAINT "FK_patient_tag_assignments_patientId" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_tag_assignments" ADD CONSTRAINT "FK_patient_tag_assignments_tagId" FOREIGN KEY ("tagId") REFERENCES "patient_tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "patient_tag_assignments"`);
    await queryRunner.query(`DROP TABLE "patient_tags"`);
  }
}
