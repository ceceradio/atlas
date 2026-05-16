import { ChoreProfileHistoryEntry } from '@/store/atlasApi'
import { Box, Text } from '@chakra-ui/react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  TooltipProps,
} from 'recharts'

interface Props {
  history: ChoreProfileHistoryEntry[]
  metric: 'averagePerDay' | 'weightedAveragePerDay'
}

const LABELS: Record<Props['metric'], string> = {
  averagePerDay: 'Avg chores / day (14d rolling)',
  weightedAveragePerDay: 'Weighted avg / day (14d rolling)',
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value as number
  return (
    <Box background="white" border="1px solid" borderColor="gray.200" borderRadius="md" padding="0.5rem 0.75rem" fontSize="xs" boxShadow="sm">
      <Text color="gray.400" mb="0.2rem">{label}</Text>
      <Text fontWeight="semibold" color="gray.700">{value.toFixed(2)}</Text>
    </Box>
  )
}

export function HistoryLineChart({ history, metric }: Props) {
  if (history.length === 0) {
    return <Text fontSize="sm" color="gray.400" paddingTop="0.75rem">No history data available.</Text>
  }

  const data = history.map((entry) => ({
    date: new Date(entry.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }),
    value: entry[metric],
  }))

  const barWidth = 20
  const chartWidth = Math.max(400, data.length * barWidth + 80)

  return (
    <Box paddingTop="0.75rem" overflowX="auto">
      <Text fontSize="xs" color="gray.500" mb="0.5rem">{LABELS[metric]}</Text>
      <Box width={`${chartWidth}px`} height="200px">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" interval={Math.floor(data.length / 20)} />
            <YAxis tick={{ fontSize: 11 }} width={36} />
            <Tooltip cursor={{ stroke: 'rgba(0,0,0,0.1)' }} content={<CustomTooltip />} />
            <Line type="monotone" dataKey="value" stroke="#4299E1" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}
