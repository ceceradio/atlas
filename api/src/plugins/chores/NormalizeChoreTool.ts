import { Atlas } from '@/atlas/Atlas'
import { ITool } from '@/atlas/IAtlas'
import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'

type NormalizeChoreArgs = {
  normalized: string
}

export const NormalizeChoreTool: ITool<NormalizeChoreArgs> = {
  name: 'NormalizeChore',
  description:
    'Convert a specific chore description to a generalized canonical form for matching against chore definitions.',
  arguments: {
    type: 'object',
    properties: {
      normalized: {
        type: 'string',
        description:
          'The generalized form of the chore. Specific rooms replaced with "[any room]" for room-varying chores; effort/speed qualifiers removed.',
      },
    },
    required: ['normalized'],
  },
  call: async (_request, _response, value) => value,
}

const NORMALIZE_SYSTEM_MESSAGE = `
You generalize chore descriptions into a canonical form for matching against a chore definition library.
People like to make funny phrases about chores, but you should convert them into a straightforward form that captures the core task without any fluff.
This helps us match them to existing chore definitions.
Be sure to keep meaningful names and modifiers such as "green" in "green bathroom" and "my" in "my room."
These are important for distinguishing between different chores. But remove irrelevant qualifiers like "quick", "little", "for 4/5 + guest", "AM/PM", or "in the morning".

Apply these rules:

1. Change slang terms to regular words:
  - "gronks" -> "groceries"
  - "recyclies" -> "recycling"
  - "trashies" -> "trash"
  - "dishies" -> "dishwasher" / "dishes" (if context implies loading/unloading; otherwise keep as "dishes")
  - "loady" -> "loaded the dishwasher"
  - "unloady" -> "unloaded the dishwasher"
  - "vaccd" -> "vacuumed"
2. **Normalize phrasing**: remove filler words, use a clean infinitive-style verb.
3. Remove temporal information. e.g. "for 4/5 + guest", "AM", "PM", or "in the morning" should be removed.

# Examples

Input: "put in new garage trash bags"
Output: "rebagged garage cans"

Input: "quick vacuumed the second floor hallway"
Output: "quick vacuumed second floor hallway"

Input: "did green bathroom towel laundry"
Output: "did bathroom towel laundry"

Input: "wet swiffed the kitchen night time"
Output: "wet swiffed kitchen"

Input: "shoveled"
Output: "shoveled snow"

Input: "swept the kitchen floor"
Output: "swept kitchen floor"

Input: "cleaned the pink bathroom toilet"
Output: "cleaned the toilet"

Input: "wiped down the green bathroom mirror"
Output: "wiped down the mirror"

Input: "ordered gronks"
Output: "ordered groceries"

Input: "Hand washes like 10 dishes"
Output: "hand washed dishes"

Input: "loady"
Output: "loaded the dishwasher"

Input: "kitchen trash pm"
Output: "took out the kitchen trash"

Input: "cooked dinner for 4/5 + guest"
Output: "cooked dinner"

Input: "cleaned crap out of the fridge"
Output: "cleared old food out of the fridge"

Input: "tiny drying rack"
Output: "put away drying rack dishes"

Input: "moweyd the lawny"
Output: "mowed the lawn"

Input: "snoweyd the blowey"
Output: "snow blowed"

`

export async function normalizeChore(
  chore: string,
  tracer?: ITracer,
): Promise<string> {
  const result = await Atlas.processToolRequest(
    NormalizeChoreTool,
    NORMALIZE_SYSTEM_MESSAGE,
    [chore],
    undefined,
    tracer,
  )
  return result.normalized
}
