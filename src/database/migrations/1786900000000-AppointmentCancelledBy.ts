import { MigrationInterface, QueryRunner } from 'typeorm';

// Tracks who actually cancelled an appointment (patient via the portal, or a
// staff member via the dashboard) — both are UserEntity rows, distinguished
// by `cancelledBy.role`.
export class AppointmentCancelledBy1786900000000
  implements MigrationInterface
{
  name = 'AppointmentCancelledBy1786900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD "cancelledByUserId" uuid`,
    );

    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_appointments_cancelled_by" FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_appointments_cancelled_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "cancelledByUserId"`,
    );
  }
}
