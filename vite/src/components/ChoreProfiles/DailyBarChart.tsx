import { Box, Text } from '@chakra-ui/react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { useChoreDateRange } from '@/helpers/useChoreDateRange'
import { DIFFICULTY_COLORS, DAILY_WEIGHTS } from './constants'

type DailyEntry = { date: string; small: number; medium: number; large: number; extraLarge: number }

interface Props {
  dailyData: DailyEntry[]
}

const segments: { key: string; label: string; color: string }[] = [
  { key: 'small', label: 'small', color: DIFFICULTY_COLORS.small },
  { key: 'medium', label: 'medium', color: DIFFICULTY_COLORS.medium },
  { key: 'large', label: 'large', color: DIFFICULTY_COLORS.large },
  { key: 'extraLarge', label: 'extra large', color: DIFFICULTY_COLORS['extra large'] },
]

export function DailyBarChart({ dailyData }: Props) {
  const [from, , to] = useChoreDateRange()

  if (dailyData.length === 0) {
    return <Text fontSize="sm" color="gray.400" paddingTop="0.75rem">No daily data available.</Text>
  }

  const byDate = Object.fromEntries(dailyData.map((d) => [d.date, d]))
  const dates: string[] = []
  const first = from ? new Date(from) : new Date(dailyData[0].date)
  const last = to ? new Date(to) : new Date(dailyData[dailyData.length - 1].date)
  for (const d = new Date(first); d <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10))
  }

  const data = dates.map((iso) => {
    const d = byDate[iso] ?? { date: iso, small: 0, medium: 0, large: 0, extraLarge: 0 }
    return {
      date: new Date(iso + 'T12:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'America/New_York' }),
      small: d.small * DAILY_WEIGHTS.small,
      medium: d.medium * DAILY_WEIGHTS.medium,
      large: d.large * DAILY_WEIGHTS.large,
      extraLarge: d.extraLarge * DAILY_WEIGHTS.extraLarge,
      // raw counts for tooltip
      _small: d.small,
      _medium: d.medium,
      _large: d.large,
      _extraLarge: d.extraLarge,
    }
  })

  const barWidth = 20
  const chartWidth = Math.max(400, data.length * barWidth + 80)

  return (
    <Box paddingTop="0.75rem" overflowX="auto">
      <Text fontSize="xs" color="gray.500" mb="0.5rem">Weighted chores per day</Text>
      <Box width={`${chartWidth}px`} height="200px">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 0 }} barSize={12} barCategoryGap="20%">
            <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              formatter={(value, name, props) => {
                const rawKey = `_${name}` as keyof typeof props.payload
                const raw = props.payload[rawKey] as number
                const w = DAILY_WEIGHTS[name as keyof typeof DAILY_WEIGHTS]
                const label = name === 'extraLarge' ? 'extra large' : name
                return [`${raw} × ${w} = ${value}`, label]
              }}
            />
            {segments.map(({ key, color }, i) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="day"
                fill={color}
                isAnimationActive={false}
                radius={i === segments.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}
