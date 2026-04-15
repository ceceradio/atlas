import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { embedQwen } from '@/atlas/ai-compat/openai/embed-qwen'
import { Atlas } from '@/atlas/Atlas'
import { dedupe } from '@/lib/dedupe'
import { magi } from '@/lib/magi'
import { findClosestChoreDefinitions } from './choreDefinitionEmbeddings'
import { IsNewChoreDefinitionTool } from './IsNewChoreDefinitionTool'
import { normalizeChore } from './NormalizeChoreTool'
import { magiRateChoreDifficulty } from './rateChoreDifficultySequential'

const TRIALS = 5
const REQUIRED_AGREEMENTS = 3
const SIMILARITY_THRESHOLD = 0.88

function buildSystemMessage(existingNames: string[]): string {
  const list = dedupe(existingNames)
    .map((n) => `- ${n}`)
    .join('\n')
  return `You are a helpful assistant that determines whether a chore is a new type not covered by any existing chore definition.

You will be given a chore in two forms:

- **Original**: the raw chore description as parsed from the message
- **Normalized**: a canonical form with specific rooms replaced by "[any room]" and qualifiers removed

Your job is to decide if either form matches any of the existing chore definitions below.

# Matching rules

- Bracket notation like "[any room]" or "[kitchen/living room]" is a wildcard — a chore performed in any room matches that pattern.
- If the chore is a specific instance of a general pattern it not NOT new (isNew: \`false\`).
- Only call a chore new if it genuinely represents a type of task not covered by any definition in the list. If it's kinda close, then its not a new chore.
- When in doubt, lean toward NOT new (isNew: \`false\`) — it is better to miss a new chore than to create duplicate definitions.

# Examples

These are examples of how to apply the rules above. These aren't meant to be exhaustive, just to illustrate the thought process.

User Input: "vacuumed the green bathroom"
Normalized: "vacuumed [any room]"
Definitions include: "vacuumed [kitchen, living room, green room, game room, utility room]"
→ isNew: \`false\`

User Input: "quick vacuumed the second floor hallway"
Normalized: "vacuumed [any room]"
Definitions include: "vacuumed [any room]"
→ isNew: \`false\`

User Input: "did green bathroom towel laundry"
Normalized: "did laundry"
Definitions include: "did [any] laundry"
→ isNew: \`false\`

User Input: "deep cleaned the bathroom"
Normalized: "deep cleaned [any bathroom]"
Definitions include: "deep cleaned the [any bathroom] (toilet, tub/shower, sink, floor, mirrors)"
→ isNew: \`false\`

User Input: "did laundry for both bathrooms"
Normalized: "did bathroom laundry"
Definitions include: "did laundry"
→ isNew: \`false\` 

User Input: "fixed the leaky faucet"
Normalized: "repaired [any fixture]"
Definitions include: "repaired [any appliance/furniture/fixture]"
→ isNew: \`false\`

User Input: "reorganized the spice cabinet"
Normalized: "reorganized cabinet"
Definitions include: "reorganized [a small area such as a cabinet, countertop, or shelf]"
→ isNew: \`false\`

User Input: "rebagged the garage cans"
Normalized: "rebagged [any trash cans]"
Definitions include: "tied off and rebagged any amount of garage can(s)"
→ isNew: \`false\`

User Input: "wiped down the bathroom mirror"
Normalized: "wiped down the mirror"
Definitions include: "wiped down the bathroom sink"
→ isNew: \`true\`

User Input: "cleared cardboard out of the living room"
Normalized: "cleared cardboard out of room"
Definitions include: "cleaned the living room"
→ isNew: \`true\`

# Existing Chore Definitions

These are already known/defined chores that seem fairly close to the user input.
If the user input or normalized chore resembles any of the chores in this list, you must reply with isNew as \`false\`. If they do not match any of these, reply with isNew as \`true\`.

${list || '(none yet)'}
`
}

/**
 * Given a list of chore strings from choreSplitter, returns the subset that
 * do not match any existing ChoreDefinition.
 *
 * Pass 1 — exact case-insensitive match against all known definition names.
 * Pass 2 — normalize each surviving chore into a canonical form (strips qualifiers, generalizes rooms).
 * Pass 3 — exact case-insensitive match on the normalized form.
 * Pass 4 — magi-wrapped AI call for anything that survives all exact matches.
 */
export async function identifyNewChoreDefinitions(
  chores: string[],
  tracer?: ITracer,
): Promise<string[]> {
  const newChores: string[] = []

  for (const chore of chores) {
    const isNew = await identifyNewChoreDefinition(chore, tracer)
    if (isNew) newChores.push(chore)
  }

  return newChores
}

async function identifyNewChoreDefinition(
  chore: string,
  tracer?: ITracer,
): Promise<boolean> {
  //normalize each chore into a canonical/Normalized form (in parallel)
  const normalizedForm = await normalizeChore(chore, tracer).catch((err) => {
    console.warn(
      `identifyNewChoreDefinitions: normalization failed for "${chore}"`,
      err,
    )
    return chore // fall back to original on error
  })

  // Pass 1: embedding + similarity search against existing definitions
  const embeddings = [await embedQwen(chore), await embedQwen(normalizedForm)]
  const matches = await Promise.all(
    embeddings.map(
      async (embedding) => await findClosestChoreDefinitions(embedding),
    ),
  )
  const flattenedMatches = matches
    .flat()
    .filter((m): m is Exclude<typeof m, null> => m !== null)
    .sort((a, b) => b.similarity - a.similarity)
  // are any matches above the threshold?
  const bestMatch = flattenedMatches[0]
  if (bestMatch && bestMatch.similarity >= SIMILARITY_THRESHOLD) {
    console.debug(
      `identifyNewChoreDefinitions: "${chore}" matches "${bestMatch.name}" ` +
        `(similarity ${bestMatch.similarity.toFixed(4)}) — skipping`,
    )
    return false
  }

  // Pass 2: magi AI check against the best matching definitions
  const systemMessage = buildSystemMessage(flattenedMatches.map((m) => m.name))

  try {
    const isNew = await magi(
      async () => {
        const result = await Atlas.processToolRequest(
          IsNewChoreDefinitionTool,
          systemMessage,
          [`User Input: ${chore}\nNormalized Form: ${normalizedForm}`],
          undefined,
          tracer,
        )
        return result.isNew
      },
      REQUIRED_AGREEMENTS,
      TRIALS,
    )
    if (!isNew) return false
  } catch (err) {
    // magi failed to reach consensus — treat as not new to avoid noise
    console.warn(
      `identifyNewChoreDefinitions: no consensus for "${chore}"`,
      err,
    )
    return false
  }

  // no exact matches and magi consensus is new — this is a new chore definition
  // lets make sure it qualifies "as a chore" and not "not a chore"
  const size = await magi(
    async () => await magiRateChoreDifficulty(normalizedForm, tracer),
    REQUIRED_AGREEMENTS,
    TRIALS,
  )
  if (size === 'not a chore') {
    console.debug(
      `identifyNewChoreDefinitions: "${chore}" is not a chore according to magi — skipping`,
    )
    return false
  }

  console.debug(
    `identifyNewChoreDefinitions: "${chore}" is a new chore definition! (best match was "${
      bestMatch?.name
    }" with similarity ${bestMatch?.similarity.toFixed(4)})`,
  )
  return true
}
