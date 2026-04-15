import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateChoreDefinitionTable1744596000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS chore_definition (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        size text,
        "discordVoteMessageId" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT chore_definition_name_unique UNIQUE (name)
      )
    `)

    await queryRunner.query(`
      ALTER TABLE chore_definition
      ADD COLUMN IF NOT EXISTS embedding vector(1024)
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS chore_definition_embedding_hnsw_idx
      ON chore_definition
      USING hnsw (embedding vector_cosine_ops)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS chore_definition_embedding_hnsw_idx`)
    await queryRunner.query(`DROP TABLE IF EXISTS chore_definition`)
    await queryRunner.query(`DROP EXTENSION IF EXISTS vector`)
  }
}
