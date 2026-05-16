import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateChoreDefinitionVoteTable1776300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS chore_definition_vote (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "discordName" TEXT NOT NULL,
        "tallyDate" DATE NOT NULL
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS chore_definition_vote`)
  }
}
