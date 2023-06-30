import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1688066254975 implements MigrationInterface {
    name = 'Migration1688066254975'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "message" ("uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "content" character varying NOT NULL, "authorUuid" uuid, "conversationUuid" uuid, CONSTRAINT "PK_3c5cb33791204380214230107d5" PRIMARY KEY ("uuid"))`);
        await queryRunner.query(`CREATE TABLE "conversation" ("uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "creatorUuid" uuid, "organizationUuid" uuid, CONSTRAINT "PK_c3d11bfb7322e9fa17913426449" PRIMARY KEY ("uuid"))`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_d681d58393297631830470b4c54" FOREIGN KEY ("authorUuid") REFERENCES "user"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_5ba58860f1343e2b764c18ae644" FOREIGN KEY ("conversationUuid") REFERENCES "conversation"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversation" ADD CONSTRAINT "FK_25651b5c4939fa67c8e00a055cf" FOREIGN KEY ("creatorUuid") REFERENCES "user"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversation" ADD CONSTRAINT "FK_2f7295b7ced626e694f85790f6f" FOREIGN KEY ("organizationUuid") REFERENCES "organization"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "conversation" DROP CONSTRAINT "FK_2f7295b7ced626e694f85790f6f"`);
        await queryRunner.query(`ALTER TABLE "conversation" DROP CONSTRAINT "FK_25651b5c4939fa67c8e00a055cf"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_5ba58860f1343e2b764c18ae644"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_d681d58393297631830470b4c54"`);
        await queryRunner.query(`DROP TABLE "conversation"`);
        await queryRunner.query(`DROP TABLE "message"`);
    }

}
