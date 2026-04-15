import { ChoreDefinition } from '@/entity/ChoreDefinition'
import { ChoreDifficulty } from '@/plugins/chores/ChoreTypes'
import { DataSource } from 'typeorm'

type SeedEntry = { name: string; size: ChoreDifficulty }

const SEED_DEFINITIONS: SeedEntry[] = [
  // Not a chore
  { name: 'moved my stuff out of [any room]', size: 'not a chore' },
  { name: 'refilled soap in bathroom', size: 'not a chore' },
  { name: 'replaced toilet paper', size: 'not a chore' },
  { name: 'replaced paper towels', size: 'not a chore' },
  { name: 'refilled matches/air freshener', size: 'not a chore' },

  // Small
  { name: 'put away drying rack dishes', size: 'small' },
  { name: 'cleaned the kitchen countertops', size: 'small' },
  { name: 'rinsed the kitchen sink', size: 'small' },
  { name: 'unloaded the dishwasher', size: 'small' },
  { name: 'partially loaded the dishwasher', size: 'small' },
  { name: 'wiped down the bathroom sink', size: 'small' },
  { name: 'cleaned the stovetop', size: 'small' },
  { name: 'quickly wet swiffed [any room]', size: 'small' },
  { name: 'quickly vacuumed [any room]', size: 'small' },
  { name: 'vacuumed second [hallway, any stairway, any stairway landing, any entryway]', size: 'small' },
  { name: 'took out [any room] trash', size: 'small' },
  { name: 'tied off and rebagged any amount of garage can(s)', size: 'small' },
  { name: 'took trash out to curb', size: 'small' },
  { name: 'put away groceries', size: 'small' },
  { name: 'replaced air filter', size: 'small' },

  // Medium
  { name: 'thoroughly cleaned the kitchen sink', size: 'medium' },
  { name: 'did the (towel/wetswiff/other?) laundry for [kitchen/any bathroom]', size: 'medium' },
  { name: 'wetswiffed the [green bathroom, pink bathroom, second floor hallway, narrow stairway, grand stairway, grand stairway landing]', size: 'medium' },
  { name: 'wet swiffed the second floor hallway', size: 'medium' },
  { name: 'thoroughly cleaned the bathroom sink', size: 'medium' },
  { name: 'cleaned scrubbed the inside of the toilet bowl', size: 'medium' },
  { name: 'vacuumed [kitchen, living room, green room, game room, utility room]', size: 'medium' },
  { name: 'threw out leftovers from the fridge', size: 'medium' },
  { name: 'replaced a water filter', size: 'medium' },
  { name: 'cleaned the microwave', size: 'medium' },
  { name: 'ordered groceries', size: 'medium' },
  { name: 'hand washed pots/pans', size: 'medium' },
  { name: 'spread salt on the sidewalks/driveway', size: 'medium' },
  { name: 'reorganized [a small area such as a cabinet, countertop, or shelf]', size: 'medium' },

  // Large
  { name: 'cooked dinner', size: 'large' },
  { name: 'cleaned the toilet thoroughly', size: 'large' },
  { name: 'cleaned the tub/shower', size: 'large' },
  { name: 'wet swiffed the [kitchen/living room/utility room]', size: 'large' },
  { name: 'thoroughly vacuumed [any room]', size: 'large' },
  { name: 'thoroughly cleaned [any appliance]', size: 'large' },
  { name: 'picked up trash around the yard', size: 'large' },
  { name: 'mowed the lawn', size: 'large' },
  { name: 'snow blowed/shoveled', size: 'large' },
  { name: 'repaired [any appliance/furniture/fixture]', size: 'large' },
  { name: 'reorganized [a large area like a room]', size: 'large' },

  // Extra large
  { name: 'deep cleaned the kitchen (counters, sink, stovetop, microwave, appliances)', size: 'extra large' },
  { name: 'deep cleaned the [any bathroom] (toilet, tub/shower, sink, floor, mirrors)', size: 'extra large' },
  { name: 'thoroughly cleaned the entire [any room] top to bottom', size: 'extra large' },
  { name: 'cooked a large meal/feast for the household', size: 'extra large' },
  { name: 'grocery shopped and put away a full grocery order', size: 'extra large' },
  { name: 'completed a major home repair or installation', size: 'extra large' },
  { name: 'reorganized or cleaned out the entire garage/basement/attic', size: 'extra large' },
  { name: 'did a full house clean/tidy', size: 'extra large' },
]

export default async function seedChoreDefinitions(dataSource: DataSource): Promise<string> {
  const repo = dataSource.getRepository(ChoreDefinition)

  const existing = await repo.count()
  if (existing > 0) {
    return `Skipped — ${existing} chore definition(s) already exist.`
  }

  const entities = SEED_DEFINITIONS.map((entry) => repo.create(entry))
  await repo.save(entities)

  return `Seeded ${entities.length} chore definitions.`
}
