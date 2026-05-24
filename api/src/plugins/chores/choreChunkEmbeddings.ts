import { postgres } from '@/data-source'
import pgvector from 'pgvector'

export async function setChoreChunkEmbedding(
  choreId: string,
  embedding: number[],
): Promise<void> {
  await postgres.query(
    `INSERT INTO chore_chunk ("choreId", embedding) VALUES ($1, $2::vector)`,
    [choreId, pgvector.toSql(embedding)],
  )
}

export async function findSimilarChores(
  embedding: number[],
  limit = 10,
): Promise<Array<{ choreId: string; similarity: number }>> {
  const rows: Array<{ choreId: string; similarity: number }> = await postgres.query(
    `SELECT "choreId", 1 - (embedding <=> $1::vector) AS similarity
     FROM chore_chunk
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [pgvector.toSql(embedding), limit],
  )
  return rows
}

export type RecentChoreMatch = {
  id: string
  description: string
  doneAt: Date
  difficulty: string
  similarity: number
}

export type LastDoneInfo = {
  doneAt: Date
  choreId: string
  choreDescription: string
  choreDifficulty: string
  authorName: string
}

export async function findLastDoneAtByDefinitions(
  definitionIds: string[],
): Promise<Map<string, LastDoneInfo>> {
  if (definitionIds.length === 0) return new Map()

  const rows: Array<{ definitionId: string } & LastDoneInfo> = await postgres.query(
    `SELECT DISTINCT ON (cdm."choreDefinitionId")
       cdm."choreDefinitionId" AS "definitionId",
       c.id AS "choreId",
       c.description AS "choreDescription",
       c.difficulty AS "choreDifficulty",
       c."doneAt",
       cm."discordAuthorName" AS "authorName"
     FROM chore_definition_match cdm
     JOIN chore c ON c.id = cdm."choreId"
     JOIN chore_message cm ON cm.id = c."choreMessageId"
     WHERE cdm."choreDefinitionId" = ANY($1)
     ORDER BY cdm."choreDefinitionId", c."doneAt" DESC`,
    [definitionIds],
  )

  return new Map(rows.map((r) => [r.definitionId, {
    doneAt: r.doneAt,
    choreId: r.choreId,
    choreDescription: r.choreDescription,
    choreDifficulty: r.choreDifficulty,
    authorName: r.authorName,
  }]))
}

export async function findMostRecentSimilarChore(
  embedding: number[],
  limit = 10,
): Promise<RecentChoreMatch[]> {
  const rows: Array<{
    id: string
    description: string
    doneAt: Date
    difficulty: string
    similarity: number
  }> = await postgres.query(
    `SELECT c.id, c.description, c."doneAt", c.difficulty,
            MAX(1 - (cc.embedding <=> $1::vector)) AS similarity
     FROM chore_chunk cc
     JOIN chore c ON c.id = cc."choreId"
     WHERE cc.embedding IS NOT NULL
     GROUP BY c.id, c.description, c."doneAt", c.difficulty
     ORDER BY c."doneAt" DESC
     LIMIT $2`,
    [pgvector.toSql(embedding), limit],
  )
  return rows
}
