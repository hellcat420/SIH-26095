import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialDosjeSchema1740000000000 implements MigrationInterface {
  name = 'InitialDosjeSchema1740000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "users_role_enum" AS ENUM ('Inspector', 'Official', 'NGOAdmin', 'Beneficiary', 'Authority')`);
    await queryRunner.query(`CREATE TYPE "institutes_type_enum" AS ENUM ('Project', 'Institute', 'NGO')`);
    await queryRunner.query(`CREATE TYPE "institutes_status_enum" AS ENUM ('Active', 'Flagged', 'Suspended')`);
    await queryRunner.query(`CREATE TYPE "cameras_status_enum" AS ENUM ('Online', 'Offline', 'Tampered')`);
    await queryRunner.query(`CREATE TYPE "assignments_status_enum" AS ENUM ('Pending', 'InProgress', 'Completed', 'Missed')`);
    await queryRunner.query(`CREATE TYPE "assignments_assignmenttype_enum" AS ENUM ('Random', 'Manual', 'Triggered')`);
    await queryRunner.query(`CREATE TYPE "vc_sessions_triggertype_enum" AS ENUM ('Random', 'Manual')`);
    await queryRunner.query(`CREATE TYPE "vc_sessions_status_enum" AS ENUM ('InProgress', 'Completed')`);

    await queryRunner.query(`CREATE TABLE "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" character varying NOT NULL,
      "phone" character varying NOT NULL,
      "email" character varying,
      "role" "users_role_enum" NOT NULL,
      "instituteId" character varying,
      "district" character varying,
      "state" character varying,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_users_phone" UNIQUE ("phone")
    )`);
    await queryRunner.query(`CREATE TABLE "otp_challenges" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "phone" character varying NOT NULL,
      "salt" character varying NOT NULL,
      "otpHash" character varying NOT NULL,
      "attempts" integer NOT NULL DEFAULT 0,
      "expiresAt" timestamptz NOT NULL,
      "consumedAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_otp_challenges_phone_createdAt" ON "otp_challenges" ("phone", "createdAt")`);
    await queryRunner.query(`CREATE TABLE "institutes" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" character varying NOT NULL,
      "type" "institutes_type_enum" NOT NULL DEFAULT 'Institute',
      "schemeType" character varying NOT NULL,
      "address" character varying NOT NULL,
      "lat" double precision NOT NULL,
      "lng" double precision NOT NULL,
      "contactPerson" character varying NOT NULL,
      "status" "institutes_status_enum" NOT NULL DEFAULT 'Active',
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE "cameras" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "instituteId" uuid NOT NULL,
      "rtspUrl" character varying NOT NULL,
      "label" character varying NOT NULL,
      "status" "cameras_status_enum" NOT NULL DEFAULT 'Offline',
      "lastPingAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "FK_cameras_instituteId" FOREIGN KEY ("instituteId") REFERENCES "institutes"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE TABLE "inspections" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "clientSubmissionId" uuid,
      "instituteId" uuid,
      "inspectorId" character varying,
      "assignmentId" character varying,
      "checklistResponses" jsonb,
      "photos" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "videos" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "gpsLat" double precision,
      "gpsLng" double precision,
      "gpsAccuracyMeters" double precision,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_inspections_clientSubmissionId" UNIQUE ("clientSubmissionId")
    )`);
    await queryRunner.query(`CREATE TABLE "assignments" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "inspectorId" character varying NOT NULL,
      "instituteId" character varying NOT NULL,
      "scheduledAt" timestamptz NOT NULL,
      "status" "assignments_status_enum" NOT NULL DEFAULT 'Pending',
      "assignmentType" "assignments_assignmenttype_enum" NOT NULL DEFAULT 'Random',
      "riskScoreAtAssignment" double precision NOT NULL DEFAULT 0,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE "assignment_audit_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "assignmentId" character varying NOT NULL,
      "action" character varying NOT NULL,
      "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE FUNCTION prevent_assignment_audit_mutation() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'assignment audit records are immutable';
      END;
    $$ LANGUAGE plpgsql`);
    await queryRunner.query(`CREATE TRIGGER "TR_assignment_audit_immutable"
      BEFORE UPDATE OR DELETE ON "assignment_audit_logs"
      FOR EACH ROW EXECUTE FUNCTION prevent_assignment_audit_mutation()`);
    await queryRunner.query(`CREATE TABLE "device_tokens" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" character varying NOT NULL,
      "token" text NOT NULL,
      "platform" character varying NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_device_tokens_token" UNIQUE ("token")
    )`);
    await queryRunner.query(`CREATE TABLE "vc_sessions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "instituteId" uuid NOT NULL,
      "initiatedBy" character varying NOT NULL,
      "roomName" character varying NOT NULL,
      "participants" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "triggerType" "vc_sessions_triggertype_enum" NOT NULL,
      "status" "vc_sessions_status_enum" NOT NULL DEFAULT 'InProgress',
      "endedAt" timestamptz,
      "recordingUrl" character varying,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_vc_sessions_roomName" UNIQUE ("roomName")
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "vc_sessions"`);
    await queryRunner.query(`DROP TABLE "device_tokens"`);
    await queryRunner.query(`DROP TRIGGER "TR_assignment_audit_immutable" ON "assignment_audit_logs"`);
    await queryRunner.query(`DROP FUNCTION prevent_assignment_audit_mutation()`);
    await queryRunner.query(`DROP TABLE "assignment_audit_logs"`);
    await queryRunner.query(`DROP TABLE "assignments"`);
    await queryRunner.query(`DROP TABLE "inspections"`);
    await queryRunner.query(`DROP TABLE "cameras"`);
    await queryRunner.query(`DROP TABLE "institutes"`);
    await queryRunner.query(`DROP INDEX "IDX_otp_challenges_phone_createdAt"`);
    await queryRunner.query(`DROP TABLE "otp_challenges"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "vc_sessions_status_enum"`);
    await queryRunner.query(`DROP TYPE "vc_sessions_triggertype_enum"`);
    await queryRunner.query(`DROP TYPE "assignments_assignmenttype_enum"`);
    await queryRunner.query(`DROP TYPE "assignments_status_enum"`);
    await queryRunner.query(`DROP TYPE "cameras_status_enum"`);
    await queryRunner.query(`DROP TYPE "institutes_status_enum"`);
    await queryRunner.query(`DROP TYPE "institutes_type_enum"`);
    await queryRunner.query(`DROP TYPE "users_role_enum"`);
  }
}
