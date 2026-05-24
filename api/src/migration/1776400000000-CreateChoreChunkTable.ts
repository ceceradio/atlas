import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateChoreChunkTable1776400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS chore_chunk (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "choreId" uuid NOT NULL REFERENCES chore(id) ON DELETE CASCADE,
        embedding vector(1024),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS chore_chunk_embedding_hnsw_idx
      ON chore_chunk
      USING hnsw (embedding vector_cosine_ops)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS chore_chunk_embedding_hnsw_idx`)
    await queryRunner.query(`DROP TABLE IF EXISTS chore_chunk`)
  }
}
