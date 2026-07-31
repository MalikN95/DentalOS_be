import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppointmentDoctorOverlapExclusion1785300000000 implements MigrationInterface {
  name = 'AppointmentDoctorOverlapExclusion1785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    await queryRunner.query(
      `ALTER TABLE "appointments" ADD COLUMN "period" tstzrange GENERATED ALWAYS AS (tstzrange("startsAt", "endsAt", '[)')) STORED`,
    );

    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "EXCL_appointments_doctor_overlap"
        EXCLUDE USING gist ("doctorProfileId" WITH =, "period" WITH &&)
        WHERE ("status" NOT IN ('cancelled', 'no_show') AND "deletedAt" IS NULL)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "EXCL_appointments_doctor_overlap"`,
    );
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "period"`);
  }
}
