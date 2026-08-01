import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `doctor_services` (DoctorProfileEntity.services @ManyToMany) was never captured in a
 * migration — it only exists today because dev/staging ran with DB_SYNC=true. This makes
 * it official for environments that only ever run migrations, while being a no-op against
 * a database where DB_SYNC already created it.
 */
export class DoctorServicesJoinTable1785700000000 implements MigrationInterface {
  name = 'DoctorServicesJoinTable1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'doctor_services'
        ) THEN
          CREATE TABLE "doctor_services" (
            "doctorProfileId" uuid NOT NULL,
            "serviceId" uuid NOT NULL,
            CONSTRAINT "PK_doctor_services" PRIMARY KEY ("doctorProfileId", "serviceId")
          );
          CREATE INDEX "IDX_doctor_services_doctorProfileId" ON "doctor_services" ("doctorProfileId");
          CREATE INDEX "IDX_doctor_services_serviceId" ON "doctor_services" ("serviceId");
          ALTER TABLE "doctor_services" ADD CONSTRAINT "FK_doctor_services_doctorProfileId" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          ALTER TABLE "doctor_services" ADD CONSTRAINT "FK_doctor_services_serviceId" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_services"`);
  }
}
