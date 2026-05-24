import { embedQwen } from '@/atlas/ai-compat/openai/embed-qwen'
import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { postgres } from '@/data-source'
import { selectFromList } from '@/subfunctions/selectFromList'
import { findClosestChoreDefinitions } from './choreDefinitionEmbeddings'

const MATCH_INSTRUCTION = `Select the definition that this chore is clearly a direct instance of.
Be strict: only select if the chore unambiguously matches the definition's exact scope.
A less thorough version is NOT a match for a thorough definition (e.g. "vacuumed the living room" does not match "thoroughly vacuumed the living room").
A broader or combined chore is NOT a match for a specific definition.
If no definition is a clear match, return null.`

export async function matchChoreToDefinition(
  description: string,
  tracer?: ITracer,
): Promise<string | null> {
  const embedding = await embedQwen(description)
  const closest = await findClosestChoreDefinitions(embedding, 10)
  if (closest.length === 0) return null

  const matched = await selectFromList(
    closest.map((m) => m.name),
    description,
    MATCH_INSTRUCTION,
    tracer,
  )
  if (!matched) return null

  const def = closest.find((m) => m.name === matched)
  return def?.id ?? null
}

export async function saveChoreDefinitionMatch(
  choreId: string,
  choreDefinitionId: string,
): Promise<void> {
  await postgres.query(
    `INSERT INTO chore_definition_match ("choreId", "choreDefinitionId")
     VALUES ($1, $2)
     ON CONFLICT ("choreId") DO NOTHING`,
    [choreId, choreDefinitionId],
  )
}
