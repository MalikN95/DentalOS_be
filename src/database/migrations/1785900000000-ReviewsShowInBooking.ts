import { MigrationInterface, QueryRunner } from 'typeorm';

/** Curates which rated reviews appear on the public online-booking widget for a doctor
 *  (separate from `featured`, which curates the future public landing page). */
export class ReviewsShowInBooking1785900000000 implements MigrationInterface {
  name = 'ReviewsShowInBooking1785900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "showInBooking" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP COLUMN IF EXISTS "showInBooking"`,
    );
  }
}
