import { ChoreProfile } from '@/store/atlasApi'
import { Box, Text } from '@chakra-ui/react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  Cell,
} from 'recharts'
import { getPersonColor } from './constants'

interface Props {
  profiles: ChoreProfile[]
  weighted?: boolean
  memberColors?: Record<string, string>
}

export function AvgPerDayChart({ profiles, weighted = false, memberColors = {} }: Props) {
  const data = [...profiles]
    .sort((a, b) => (weighted ? b.weightedAveragePerDay - a.weightedAveragePerDay : b.averagePerDay - a.averagePerDay))
    .map((p) => ({
      name: p.discordAuthorName,
      value: weighted ? p.weightedAveragePerDay : p.averagePerDay,
      fill: memberColors[p.discordAuthorName] ?? getPersonColor(p.discordAuthorName),
    }))

  return (
    <Box background="gray.50" borderRadius="md" padding="1rem">
      <Text fontSize="sm" fontWeight="semibold" mb="0.75rem" color="gray.600">
        {weighted ? 'Weighted avg / day' : 'Avg chores / day'}
      </Text>
      <ResponsiveContainer width="100%" height={40 + data.length * 36}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
        >
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 13 }} />
          <Tooltip
            formatter={(v) => [Number(v).toFixed(2), 'avg/day']}
            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
            <LabelList dataKey="value" position="right" formatter={(v) => Number(v).toFixed(2)} style={{ fontSize: 12, fill: '#718096' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  )
}
