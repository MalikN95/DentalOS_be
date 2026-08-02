import { MigrationInterface, QueryRunner } from 'typeorm';

// Adds the clinic-wide team chat table and a read-only log of patient
// email/WhatsApp sends (previously not persisted anywhere).
export class Chat1786400000000 implements MigrationInterface {
  name = 'Chat1786400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "chat_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "clinicId" uuid NOT NULL,
        "authorId" uuid NOT NULL,
        "body" text NOT NULL,
        CONSTRAINT "PK_chat_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_messages_clinic" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_chat_messages_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_chat_messages_clinic_created" ON "chat_messages" ("clinicId", "createdAt")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."patient_messages_channel_enum" AS ENUM('email', 'whatsapp')`,
    );

    await queryRunner.query(
      `CREATE TABLE "patient_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "clinicId" uuid NOT NULL,
        "patientId" uuid NOT NULL,
        "channel" "public"."patient_messages_channel_enum" NOT NULL,
        "subject" character varying,
        "body" text NOT NULL,
        "sentByUserId" uuid,
        CONSTRAINT "PK_patient_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_patient_messages_clinic" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_patient_messages_patient" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_patient_messages_sent_by" FOREIGN KEY ("sentByUserId") REFERENCES "users"("id") ON DELETE SET NULL
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_patient_messages_clinic_patient_created" ON "patient_messages" ("clinicId", "patientId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "patient_messages"`);
    await queryRunner.query(
      `DROP TYPE "public"."patient_messages_channel_enum"`,
    );
    await queryRunner.query(`DROP TABLE "chat_messages"`);
  }
}
