import { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceAcceptsOnlineBooking1785600000000 implements MigrationInterface {
  name = 'ServiceAcceptsOnlineBooking1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "services" ADD COLUMN "acceptsOnlineBooking" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "services" DROP COLUMN "acceptsOnlineBooking"`,
    );
  }
}
