import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChoreDefinitionAlias1776132000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chore_definition
      ADD COLUMN IF NOT EXISTS "aliasOfId" uuid REFERENCES chore_definition(id) ON DELETE SET NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE chore_definition DROP COLUMN IF EXISTS "aliasOfId"
    `)
  }
}
