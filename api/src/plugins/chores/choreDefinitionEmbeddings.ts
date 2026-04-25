import { postgres } from '@/data-source'
import pgvector from 'pgvector'

const SIMILARITY_THRESHOLD = 0.9

export type EmbeddingMatch = {
  id: string
  name: string
  size: string | null
  similarity: number
}

/**
 * Persist an embedding vector for a ChoreDefinition row.
 */
export async function setChoreDefinitionEmbedding(
  id: string,
  embedding: number[],
): Promise<void> {
  await postgres.query(
    `UPDATE chore_definition SET embedding = $1::vector WHERE id = $2`,
    [pgvector.toSql(embedding), id],
  )
}

/**
 * Find the closest ChoreDefinition by cosine similarity.
 * Returns the best match only if it meets SIMILARITY_THRESHOLD.
 * When no match clears the threshold, logs the input chore and top 3 candidates.
 */
export async function findClosestChoreDefinitions(
  embedding: number[],
): Promise<EmbeddingMatch[] | null> {
  const rows: Array<EmbeddingMatch> = await postgres.query(
    `SELECT id, size, name, 1 - (embedding <=> $1::vector) AS similarity
     FROM chore_definition
     WHERE embedding IS NOT NULL
     AND size IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT 3`,
    [pgvector.toSql(embedding)],
  )

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    size: r.size,
    similarity: r.similarity,
  }))
}

/**
 * Find the closest sized canonical (non-alias) ChoreDefinitions by cosine similarity.
 * Used for alias detection — only canonical definitions can be aliased.
 */
export async function findClosestSizedCanonicalChoreDefinitions(
  embedding: number[],
  limit = 16,
): Promise<EmbeddingMatch[]> {
  const rows: Array<{
    id: string
    size: string | null
    name: string
    similarity: number
  }> = await postgres.query(
    `SELECT id, size, name, 1 - (embedding <=> $1::vector) AS similarity
       FROM chore_definition
       WHERE embedding IS NOT NULL
         AND size IS NOT NULL
         AND "aliasOfId" IS NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
    [pgvector.toSql(embedding), limit],
  )

  return rows.map((r) => ({
    id: r.id,
    size: r.size,
    name: r.name,
    similarity: r.similarity,
  }))
}

/**
 * Find the closest ChoreDefinition by cosine similarity.
 * Returns the best match only if it meets SIMILARITY_THRESHOLD.
 * When no match clears the threshold, logs the input chore and top 3 candidates.
 */
export async function findClosestUnratedChoreDefinitions(
  embedding: number[],
): Promise<EmbeddingMatch[] | null> {
  const rows: Array<{
    id: string
    size: string | null
    name: string
    similarity: number
  }> = await postgres.query(
    `SELECT id, size, name, 1 - (embedding <=> $1::vector) AS similarity
     FROM chore_definition
     WHERE embedding IS NOT NULL
     AND size IS NULL
     ORDER BY embedding <=> $1::vector
     LIMIT 3`,
    [pgvector.toSql(embedding)],
  )

  return rows.map((r) => ({
    id: r.id,
    size: null,
    name: r.name,
    similarity: r.similarity,
  }))
}
