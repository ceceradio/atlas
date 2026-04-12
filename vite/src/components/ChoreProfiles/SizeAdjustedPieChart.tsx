import { ChoreProfile } from '@/store/atlasApi'
import { Box, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import { PERSON_COLORS } from './constants'

interface Props {
  profiles: ChoreProfile[]
}

export function SizeAdjustedPieChart({ profiles }: Props) {
  const data = profiles
    .filter((p) => p.sizeAdjustedPercentOfTotal > 0)
    .map((p, i) => ({
      name: p.discordAuthorName,
      value: p.sizeAdjustedPercentOfTotal,
      fill: PERSON_COLORS[i % PERSON_COLORS.length],
    }))

  return (
    <Box background="gray.50" borderRadius="md" padding="1rem">
      <Text fontSize="sm" fontWeight="semibold" mb="0.75rem" color="gray.600">
        Size-adjusted chore share
      </Text>
      <Flex alignItems="center" gap="1rem" flexWrap="wrap">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              isAnimationActive={false}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, 'share']} />
          </PieChart>
        </ResponsiveContainer>
        <VStack alignItems="flex-start" gap="0.35rem">
          {data.map((entry) => (
            <HStack key={entry.name} gap="0.5rem">
              <Box width="12px" height="12px" borderRadius="2px" background={entry.fill} flexShrink={0} />
              <Text fontSize="sm">{entry.name}</Text>
              <Text fontSize="sm" color="gray.500">{entry.value.toFixed(1)}%</Text>
            </HStack>
          ))}
        </VStack>
      </Flex>
    </Box>
  )
}
