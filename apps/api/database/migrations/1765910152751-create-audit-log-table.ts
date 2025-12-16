import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogTable1765910152751 implements MigrationInterface {
  name = 'CreateAuditLogTable1765910152751';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "AUDIT_LOG" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" SERIAL NOT NULL, "USER_ID" character varying NOT NULL, "ACTION" character varying NOT NULL, "ENTITY_TYPE" character varying NOT NULL, "ENTITY_ID" character varying, "metadata" jsonb, CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "AUDIT_LOG"`);
  }
}
