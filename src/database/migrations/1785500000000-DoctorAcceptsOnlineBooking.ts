import { MigrationInterface, QueryRunner } from 'typeorm';

export class DoctorAcceptsOnlineBooking1785500000000 implements MigrationInterface {
  name = 'DoctorAcceptsOnlineBooking1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" ADD COLUMN "acceptsOnlineBooking" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" DROP COLUMN "acceptsOnlineBooking"`,
    );
  }
}
