import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateChoreDefinitionMatchTable1779213000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE chore_definition_match (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "choreId" uuid UNIQUE NOT NULL REFERENCES chore(id) ON DELETE CASCADE,
        "choreDefinitionId" uuid REFERENCES chore_definition(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`
      CREATE INDEX ON chore_definition_match ("choreDefinitionId")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS chore_definition_match`)
  }
}
