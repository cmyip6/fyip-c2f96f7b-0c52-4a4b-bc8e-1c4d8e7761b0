import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1763757071487 implements MigrationInterface {
    name = 'InitialMigration1763757071487'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "PERMISSIONS" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" SERIAL NOT NULL, "TASK_ID" integer NOT NULL, "ROLE_ID" integer NOT NULL, CONSTRAINT "TASK_ROLE_UNIQUE" UNIQUE ("TASK_ID", "ROLE_ID"), CONSTRAINT "PK_597849b1c3a13068a69235f32a3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ORGANIZATIONS" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" SERIAL NOT NULL, "name" character varying(50) NOT NULL, "description" character varying(512), CONSTRAINT "ORGANIZATIONS_NAME_UNIQUE" UNIQUE ("name"), CONSTRAINT "PK_020a41486107f3965616e603664" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ROLES" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" SERIAL NOT NULL, "name" character varying(50) NOT NULL, "description" character varying(50), "organization_id" integer, CONSTRAINT "ROLES_NAME_ORGANIZATION_UNIQUE" UNIQUE ("name", "organization_id"), CONSTRAINT "PK_12e12839de05b41ee6236517924" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "TASKS" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" SERIAL NOT NULL, "TITLE" character varying(50) NOT NULL, "DESCRIPTION" json, "DELETED_AT" TIMESTAMP, "DELETED_BY" character varying, "USER_ID" uuid NOT NULL, CONSTRAINT "PK_d1bd6713abd1e91ee9512056cc0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "USERS" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying(50) NOT NULL, "email" character varying(50) NOT NULL, "passwordHash" character varying(128) NOT NULL, "token" text, "ROLE_ID" integer, "ORGANIZATION_ID" integer, CONSTRAINT "USER_USERNAME_UNIQUE" UNIQUE ("username"), CONSTRAINT "PK_b16c39a00c89083529c6166fa5b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "PERMISSIONS" ADD CONSTRAINT "PERMISSION_TASK_CONSTRAINT" FOREIGN KEY ("TASK_ID") REFERENCES "TASKS"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "PERMISSIONS" ADD CONSTRAINT "PERMISSION_ROLE_CONSTRAINT" FOREIGN KEY ("ROLE_ID") REFERENCES "ROLES"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ROLES" ADD CONSTRAINT "FK_a7e7d80c2b5a4fdb507930b5812" FOREIGN KEY ("organization_id") REFERENCES "ORGANIZATIONS"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TASKS" ADD CONSTRAINT "TASK_USER_CONSTRAINT" FOREIGN KEY ("USER_ID") REFERENCES "USERS"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "USERS" ADD CONSTRAINT "USER_ROLE_CONSTRAINT" FOREIGN KEY ("ROLE_ID") REFERENCES "ROLES"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "USERS" ADD CONSTRAINT "USER_ORGANIZATION_CONSTRAINT" FOREIGN KEY ("ORGANIZATION_ID") REFERENCES "ORGANIZATIONS"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "USERS" DROP CONSTRAINT "USER_ORGANIZATION_CONSTRAINT"`);
        await queryRunner.query(`ALTER TABLE "USERS" DROP CONSTRAINT "USER_ROLE_CONSTRAINT"`);
        await queryRunner.query(`ALTER TABLE "TASKS" DROP CONSTRAINT "TASK_USER_CONSTRAINT"`);
        await queryRunner.query(`ALTER TABLE "ROLES" DROP CONSTRAINT "FK_a7e7d80c2b5a4fdb507930b5812"`);
        await queryRunner.query(`ALTER TABLE "PERMISSIONS" DROP CONSTRAINT "PERMISSION_ROLE_CONSTRAINT"`);
        await queryRunner.query(`ALTER TABLE "PERMISSIONS" DROP CONSTRAINT "PERMISSION_TASK_CONSTRAINT"`);
        await queryRunner.query(`DROP TABLE "USERS"`);
        await queryRunner.query(`DROP TABLE "TASKS"`);
        await queryRunner.query(`DROP TABLE "ROLES"`);
        await queryRunner.query(`DROP TABLE "ORGANIZATIONS"`);
        await queryRunner.query(`DROP TABLE "PERMISSIONS"`);
    }

}
