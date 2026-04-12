import { useGetChoreReactionsQuery } from '@/store/atlasApi'
import { HStack, Text } from '@chakra-ui/react'
import { rainbowPastel } from './ChoreProfiles/constants'

interface Props {
  reactions: Record<string, number>
  exclude?: Set<string>
  size?: 'sm' | 'md'
}

const SIZE = {
  sm: { img: '1.5rem', emoji: 'xl' as const, minHeight: '32px' },
  md: { img: '2.5rem', emoji: '3xl' as const, minHeight: '51px' },
}

export function ChoreReactionList({ reactions, exclude, size = 'md' }: Props) {
  const { img, emoji: emojiFontSize, minHeight } = SIZE[size]
  const { data: choreReactions } = useGetChoreReactionsQuery()
  const reactionLookup = new Map((choreReactions ?? []).map((r) => [r.name, r]))

  const visible = Object.entries(reactions)
    .filter(([emoji]) => !exclude?.has(emoji))
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])

  if (visible.length === 0) return null

  return (
    <HStack gap="0.75rem" flexWrap="wrap">
      {visible.map(([emoji, count]) => {
        const meta = reactionLookup.get(emoji)
        return (
          <HStack
            key={emoji}
            gap="0.25rem"
            borderRadius="full"
            paddingX="0.5rem"
            paddingY="0.2rem"
            minHeight={minHeight}
            alignItems="center"
            animation={`${rainbowPastel} 8s linear infinite`}
          >
            {meta?.discordId ? (
              <img
                src={`https://cdn.discordapp.com/emojis/${meta.discordId}.webp?size=240${meta.animated ? '&animated=true' : ''}`}
                alt={emoji}
                style={{ height: img, width: img, objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <Text fontSize={emojiFontSize}>{emoji}</Text>
            )}
            <Text fontSize="sm" fontWeight="semibold" color="gray.700">{count}</Text>
          </HStack>
        )
      })}
    </HStack>
  )
}
