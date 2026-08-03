import { MigrationInterface, QueryRunner } from 'typeorm';

export class DoctorMaxAdvanceBookingDays1786600000000 implements MigrationInterface {
  name = 'DoctorMaxAdvanceBookingDays1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" ADD COLUMN "maxAdvanceBookingDays" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" DROP COLUMN "maxAdvanceBookingDays"`,
    );
  }
}
