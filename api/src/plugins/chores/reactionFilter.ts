import { ReactionManager } from 'discord.js'
import { EXCLUDED_REACTIONS } from './excludedReactions'

export function filterReactions(reactions: ReactionManager): Record<string, number> {
  const result: Record<string, number> = {}
  for (const reaction of reactions.cache.values()) {
    const name = reaction.emoji.name
    if (!name) continue
    if (EXCLUDED_REACTIONS.has(name)) continue
    result[name] = reaction.count
  }
  return result
}

export type ReactionMetadata = {
  name: string
  discordId: string
  animated: boolean
}

export function extractCustomReactionMetadata(reactions: ReactionManager): ReactionMetadata[] {
  const result: ReactionMetadata[] = []
  for (const reaction of reactions.cache.values()) {
    const { name, id, animated } = reaction.emoji
    if (!name || !id) continue
    if (EXCLUDED_REACTIONS.has(name)) continue
    result.push({ name, discordId: id, animated: animated ?? false })
  }
  return result
}
