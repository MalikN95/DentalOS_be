import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `reviews` (ReviewEntity) was never captured in a migration — it only exists today
 * because dev/staging ran with DB_SYNC=true. This makes it official for environments
 * that only ever run migrations (no-op against a database where DB_SYNC already
 * created it), and adds the new `featured` column used to curate reviews for the
 * future public landing page.
 */
export class ReviewsFeatured1785800000000 implements MigrationInterface {
  name = 'ReviewsFeatured1785800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews'
        ) THEN
          CREATE TYPE "public"."reviews_status_enum" AS ENUM('pending', 'published', 'hidden');

          CREATE TABLE "reviews" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "deletedAt" TIMESTAMP WITH TIME ZONE,
            "clinicId" uuid NOT NULL,
            "appointmentId" uuid NOT NULL,
            "patientId" uuid NOT NULL,
            "doctorProfileId" uuid NOT NULL,
            "rating" smallint NOT NULL,
            "comment" text,
            "status" "public"."reviews_status_enum" NOT NULL DEFAULT 'pending',
            "requestToken" character varying,
            CONSTRAINT "PK_reviews_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_reviews_appointmentId" UNIQUE ("appointmentId"),
            CONSTRAINT "UQ_reviews_requestToken" UNIQUE ("requestToken")
          );

          CREATE INDEX "IDX_reviews_clinicId" ON "reviews" ("clinicId");

          ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_clinicId" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE;
          ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_appointmentId" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE;
          ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_patientId" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE;
          ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_doctorProfileId" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "featured" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP COLUMN IF EXISTS "featured"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."reviews_status_enum"`,
    );
  }
}
