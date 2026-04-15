import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChoreDefinitionVotePostedAt1776200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chore_definition
      ADD COLUMN IF NOT EXISTS "votePostedAt" TIMESTAMP NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chore_definition DROP COLUMN IF EXISTS "votePostedAt"
    `)
  }
}
