import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1783359042622 implements MigrationInterface {
  name = 'Init1783359042622';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('create', 'update', 'delete', 'login', 'access')`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "clinicId" uuid NOT NULL, "actorId" uuid, "action" "public"."audit_logs_action_enum" NOT NULL, "entityName" character varying NOT NULL, "entityId" uuid, "before" jsonb, "after" jsonb, "ip" character varying, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c0ec52f017ac513f07ee6e749e" ON "audit_logs"  ("entityName", "entityId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0f51c893e688797d2695563f30" ON "audit_logs"  ("clinicId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "clinics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "name" character varying NOT NULL, "subdomain" character varying NOT NULL, "logoKey" character varying, "address" character varying, "phone" character varying, "email" character varying, "workingHours" jsonb, "timezone" character varying NOT NULL DEFAULT 'UTC', "currency" character varying(3) NOT NULL DEFAULT 'USD', "language" character varying(5) NOT NULL DEFAULT 'en', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_c635121e4855c36057b0983c37f" UNIQUE ("subdomain"), CONSTRAINT "PK_5513b659e4d12b01a8ab3956abc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "branches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "clinicId" uuid NOT NULL, "name" character varying NOT NULL, "address" character varying NOT NULL, "latitude" numeric(10,7), "longitude" numeric(10,7), "phone" character varying, "workingHours" jsonb, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fbef005f9ce643c8e06eda0204" ON "branches"  ("clinicId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."equipment_status_enum" AS ENUM('active', 'maintenance', 'broken', 'decommissioned')`,
    );
    await queryRunner.query(
      `CREATE TABLE "equipment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "branchId" uuid NOT NULL, "cabinetId" uuid, "name" character varying NOT NULL, "serialNumber" character varying, "status" "public"."equipment_status_enum" NOT NULL DEFAULT 'active', "purchasedAt" date, "notes" character varying, CONSTRAINT "PK_0722e1b9d6eb19f5874c1678740" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_764c24b2822944dface101c612" ON "equipment"  ("branchId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "cabinets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "branchId" uuid NOT NULL, "name" character varying NOT NULL, "number" character varying, "description" character varying, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_bc7cc7e3c814364dbdde3d3be6c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_068d0f5216df6dca4efc826cfc" ON "cabinets"  ("branchId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('super_admin', 'admin', 'doctor', 'receptionist', 'assistant')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "clinicId" uuid NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'receptionist', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b1aeede8f5b5582f3b4e7905f3" ON "users"  ("clinicId", "email") `,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ADD CONSTRAINT "FK_fbef005f9ce643c8e06eda02046" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "equipment" ADD CONSTRAINT "FK_764c24b2822944dface101c612c" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "equipment" ADD CONSTRAINT "FK_b7d3a385c8848b166aebd0d8d1c" FOREIGN KEY ("cabinetId") REFERENCES "cabinets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cabinets" ADD CONSTRAINT "FK_068d0f5216df6dca4efc826cfcd" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_edb259d369bd38b553cf10e04bc" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_edb259d369bd38b553cf10e04bc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cabinets" DROP CONSTRAINT "FK_068d0f5216df6dca4efc826cfcd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "equipment" DROP CONSTRAINT "FK_b7d3a385c8848b166aebd0d8d1c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "equipment" DROP CONSTRAINT "FK_764c24b2822944dface101c612c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" DROP CONSTRAINT "FK_fbef005f9ce643c8e06eda02046"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b1aeede8f5b5582f3b4e7905f3"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_068d0f5216df6dca4efc826cfc"`,
    );
    await queryRunner.query(`DROP TABLE "cabinets"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_764c24b2822944dface101c612"`,
    );
    await queryRunner.query(`DROP TABLE "equipment"`);
    await queryRunner.query(`DROP TYPE "public"."equipment_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fbef005f9ce643c8e06eda0204"`,
    );
    await queryRunner.query(`DROP TABLE "branches"`);
    await queryRunner.query(`DROP TABLE "clinics"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0f51c893e688797d2695563f30"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c0ec52f017ac513f07ee6e749e"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
  }
}
