import { MigrationInterface, QueryRunner } from 'typeorm';

// DoctorScheduleEntity and ScheduleExceptionEntity had only ever existed via
// DB_SYNC in dev, never in a migration — same gap PatientTags/reviews/etc.
// had before they got their own first migration.
export class DoctorSchedules1786500000000 implements MigrationInterface {
  name = 'DoctorSchedules1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "doctor_schedules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "doctorProfileId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "weekday" smallint NOT NULL,
        "startTime" character varying(5) NOT NULL,
        "endTime" character varying(5) NOT NULL,
        CONSTRAINT "PK_doctor_schedules" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_doctor_schedules_doctor_branch_weekday" UNIQUE ("doctorProfileId", "branchId", "weekday"),
        CONSTRAINT "FK_doctor_schedules_doctor" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_doctor_schedules_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_doctor_schedules_doctorProfileId" ON "doctor_schedules" ("doctorProfileId")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."schedule_exceptions_type_enum" AS ENUM('vacation', 'sick_leave', 'holiday', 'day_off')`,
    );

    await queryRunner.query(
      `CREATE TABLE "schedule_exceptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "doctorProfileId" uuid NOT NULL,
        "type" "public"."schedule_exceptions_type_enum" NOT NULL,
        "dateFrom" date NOT NULL,
        "dateTo" date NOT NULL,
        "comment" character varying,
        CONSTRAINT "PK_schedule_exceptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_schedule_exceptions_doctor" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_schedule_exceptions_doctorProfileId" ON "schedule_exceptions" ("doctorProfileId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "schedule_exceptions"`);
    await queryRunner.query(
      `DROP TYPE "public"."schedule_exceptions_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "doctor_schedules"`);
  }
}
