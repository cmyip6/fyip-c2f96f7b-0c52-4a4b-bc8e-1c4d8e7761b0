import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1763853565789 implements MigrationInterface {
  name = 'InitialMigration1763853565789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "ORGANIZATION_RELATION" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" character varying,
                "updated_by" character varying,
                "id" SERIAL NOT NULL,
                "PARENT_ORGANIZATION_ID" integer,
                "CHILD_ORGANIZATION_ID" integer NOT NULL,
                CONSTRAINT "ORGANIZATION_RELATION_UNIQ_CHILD" UNIQUE ("CHILD_ORGANIZATION_ID"),
                CONSTRAINT "ORGANIZATION_RELATION_UNIQ" UNIQUE ("PARENT_ORGANIZATION_ID", "CHILD_ORGANIZATION_ID"),
                CONSTRAINT "ORGANIZATION_RELATION_CHECK" CHECK ("PARENT_ORGANIZATION_ID" <> "CHILD_ORGANIZATION_ID"),
                CONSTRAINT "PK_c5f934780e296877fe09c16f755" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE INDEX "ORGANIZATION_RELATION_PARENT_FOLDER_INDEX"
            ON "ORGANIZATION_RELATION" ("PARENT_ORGANIZATION_ID")
        `);

    await queryRunner.query(`
            CREATE INDEX "ORGANIZATION_RELATION_CHILD_FOLDER_INDEX"
            ON "ORGANIZATION_RELATION" ("CHILD_ORGANIZATION_ID")
        `);

    await queryRunner.query(`
            CREATE TABLE "ORGANIZATIONS" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" character varying,
                "updated_by" character varying,
                "id" SERIAL NOT NULL,
                "name" character varying(50) NOT NULL,
                "description" character varying(512),
                CONSTRAINT "ORGANIZATIONS_NAME_UNIQUE" UNIQUE ("name"),
                CONSTRAINT "PK_020a41486107f3965616e603664" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE TABLE "PERMISSIONS" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" character varying,
                "updated_by" character varying,
                "id" SERIAL NOT NULL,
                "ENTITY_TYPE" character varying NOT NULL,
                "PERMISSION" character varying NOT NULL,
                "ROLE_ID" integer NOT NULL,
                CONSTRAINT "ENTITY_PERMISSION_ROLE_UNIQUE" UNIQUE ("ENTITY_TYPE", "PERMISSION", "ROLE_ID"),
                CONSTRAINT "PK_597849b1c3a13068a69235f32a3" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE TABLE "ROLES" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" character varying,
                "updated_by" character varying,
                "id" SERIAL NOT NULL,
                "name" character varying(50) NOT NULL,
                "description" character varying(50),
                "organization_id" integer,
                CONSTRAINT "ROLES_NAME_ORGANIZATION_UNIQUE" UNIQUE ("name", "organization_id"),
                CONSTRAINT "PK_12e12839de05b41ee6236517924" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE TABLE "USERS" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" character varying,
                "updated_by" character varying,
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "username" character varying(50) NOT NULL,
                "name" character varying(50) NOT NULL,
                "email" character varying(50) NOT NULL,
                "passwordHash" character varying(128) NOT NULL,
                "token" text,
                "USER_TYPE" character varying NOT NULL DEFAULT 'module-user',
                CONSTRAINT "USER_USERNAME_UNIQUE" UNIQUE ("username"),
                CONSTRAINT "PK_b16c39a00c89083529c6166fa5b" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
    CREATE TABLE "TASKS" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" character varying,
        "updated_by" character varying,
        "id" SERIAL NOT NULL,
        "TITLE" character varying(50) NOT NULL,
        "DESCRIPTION" json,
        "STATUS" character varying NOT NULL DEFAULT 'OPEN',
        "DELETED_AT" TIMESTAMP,
        "DELETED_BY" character varying,
        "USER_ID" uuid NOT NULL,
        "ORGANIZATION_ID" integer NOT NULL,
        "INDEX_PO" int,
        CONSTRAINT "PK_d1bd6713abd1e91ee9512056cc0" PRIMARY KEY ("id")
    )
`);

    await queryRunner.query(`
            CREATE TABLE "USER_ROLES" (
                "USER_ID" uuid NOT NULL,
                "ROLE_ID" integer NOT NULL,
                CONSTRAINT "PK_3ffb41c3b34f1edf4be72a6621b" PRIMARY KEY ("USER_ID", "ROLE_ID")
            )
        `);

    await queryRunner.query(
      `CREATE INDEX "IDX_ebeb41607e7797e24b65744c31" ON "USER_ROLES" ("USER_ID")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ed093e6e85da958f647e4bc389" ON "USER_ROLES" ("ROLE_ID")`,
    );

    await queryRunner.query(`
            ALTER TABLE "ORGANIZATION_RELATION"
            ADD CONSTRAINT "ORGANIZATION_RELATION_PARENT_ORGANIZATION_CONSTRAINT"
            FOREIGN KEY ("PARENT_ORGANIZATION_ID") REFERENCES "ORGANIZATIONS" ("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "ORGANIZATION_RELATION"
            ADD CONSTRAINT "ORGANIZATION_RELATION_CHILD_ORGANIZATION_CONSTRAINT"
            FOREIGN KEY ("CHILD_ORGANIZATION_ID") REFERENCES "ORGANIZATIONS" ("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "PERMISSIONS"
            ADD CONSTRAINT "PERMISSION_ROLE_CONSTRAINT"
            FOREIGN KEY ("ROLE_ID") REFERENCES "ROLES" ("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "ROLES"
            ADD CONSTRAINT "FK_a7e7d80c2b5a4fdb507930b5812"
            FOREIGN KEY ("organization_id") REFERENCES "ORGANIZATIONS" ("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "TASKS"
            ADD CONSTRAINT "TASK_USER_CONSTRAINT"
            FOREIGN KEY ("USER_ID") REFERENCES "USERS" ("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "TASKS"
            ADD CONSTRAINT "TASK_ORGANIZATION_CONSTRAINT"
            FOREIGN KEY ("ORGANIZATION_ID") REFERENCES "ORGANIZATIONS" ("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "USER_ROLES"
            ADD CONSTRAINT "USER_ROLES_USER_FK"
            FOREIGN KEY ("USER_ID") REFERENCES "USERS"("id")
            ON DELETE CASCADE ON UPDATE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "USER_ROLES"
            ADD CONSTRAINT "USER_ROLES_ROLE_FK"
            FOREIGN KEY ("ROLE_ID") REFERENCES "ROLES"("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "USER_ROLES" DROP CONSTRAINT "USER_ROLES_ROLE_FK"`,
    );
    await queryRunner.query(
      `ALTER TABLE "USER_ROLES" DROP CONSTRAINT "USER_ROLES_USER_FK"`,
    );
    await queryRunner.query(
      `ALTER TABLE "TASKS" DROP CONSTRAINT "TASK_ORGANIZATION_CONSTRAINT"`,
    );
    await queryRunner.query(
      `ALTER TABLE "TASKS" DROP CONSTRAINT "TASK_USER_CONSTRAINT"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ROLES" DROP CONSTRAINT "FK_a7e7d80c2b5a4fdb507930b5812"`,
    );
    await queryRunner.query(
      `ALTER TABLE "PERMISSIONS" DROP CONSTRAINT "PERMISSION_ROLE_CONSTRAINT"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ORGANIZATION_RELATION" DROP CONSTRAINT "ORGANIZATION_RELATION_CHILD_ORGANIZATION_CONSTRAINT"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ORGANIZATION_RELATION" DROP CONSTRAINT "ORGANIZATION_RELATION_PARENT_ORGANIZATION_CONSTRAINT"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ed093e6e85da958f647e4bc389"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ebeb41607e7797e24b65744c31"`,
    );
    await queryRunner.query(`DROP TABLE "USER_ROLES"`);
    await queryRunner.query(`DROP TABLE "TASKS"`);
    await queryRunner.query(`DROP TABLE "USERS"`);
    await queryRunner.query(`DROP TABLE "ROLES"`);
    await queryRunner.query(`DROP TABLE "PERMISSIONS"`);
    await queryRunner.query(`DROP TABLE "ORGANIZATIONS"`);
    await queryRunner.query(
      `DROP INDEX "public"."ORGANIZATION_RELATION_CHILD_FOLDER_INDEX"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."ORGANIZATION_RELATION_PARENT_FOLDER_INDEX"`,
    );
    await queryRunner.query(`DROP TABLE "ORGANIZATION_RELATION"`);
  }
}
