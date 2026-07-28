import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailTemplates1783700000000 implements MigrationInterface {
  name = 'EmailTemplates1783700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "email_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "clinicId" uuid NOT NULL, "name" character varying NOT NULL, "subject" character varying NOT NULL, "body" text NOT NULL, CONSTRAINT "PK_email_templates_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_templates_clinicId" ON "email_templates" ("clinicId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_templates" ADD CONSTRAINT "FK_email_templates_clinicId" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_templates" DROP CONSTRAINT "FK_email_templates_clinicId"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_email_templates_clinicId"`);
    await queryRunner.query(`DROP TABLE "email_templates"`);
  }
}
