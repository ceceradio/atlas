import { useGetChoreProfilesQuery } from '@/store/atlasApi'
import { Box, Flex, HStack, Input, Spinner, Text, VStack } from '@chakra-ui/react'
import { Button } from '@chakra-ui/react'
import { useChoreDateRange } from '@/helpers/useChoreDateRange'
import { AvgPerDayChart } from './AvgPerDayChart'
import { SizeAdjustedPieChart } from './SizeAdjustedPieChart'
import { ProfileCard } from './ProfileCard'

export function ChoreProfilesPanel() {
  const [from, setFrom, to, setTo] = useChoreDateRange()

  const { data, isLoading } = useGetChoreProfilesQuery({
    from: from || undefined,
    to: to || undefined,
  })

  const profiles = data?.profiles ?? []

  return (
    <VStack padding="1.5rem" alignItems="stretch" gap="1.5rem">
      <Box background="white" borderRadius="lg" boxShadow="sm" padding="1.25rem">
        <Text fontSize="xl" fontWeight="bold" marginBottom="0.75rem">Chore Profiles</Text>
        <HStack gap="0.5rem" flexWrap="wrap">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            width="160px"
            placeholder="From"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            width="160px"
            placeholder="To"
          />
          <Button
            size="sm"
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10)
              const thirtyDaysAgo = new Date()
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
              const thirtyAgo = thirtyDaysAgo.toISOString().slice(0, 10)
              setFrom(thirtyAgo)
              setTo(today)
            }}
          >
            Last 30 days
          </Button>
          {data?.days != null && (
            <Text fontSize="sm" color="gray.500">{data.days} day{data.days !== 1 ? 's' : ''}</Text>
          )}
        </HStack>
      </Box>

      {isLoading ? (
        <Flex justifyContent="center" padding="2rem">
          <Spinner />
        </Flex>
      ) : profiles.length === 0 ? (
        <Text color="gray.500">No chore data found for this range.</Text>
      ) : (
        <>
          <Flex gap="1.5rem" flexWrap="wrap">
            <Box flex="1" minWidth="280px">
              <AvgPerDayChart profiles={profiles} />
            </Box>
            <Box flex="1" minWidth="280px">
              <AvgPerDayChart profiles={profiles} weighted />
            </Box>
            <Box flex="1" minWidth="280px">
              <SizeAdjustedPieChart profiles={profiles} />
            </Box>
          </Flex>

          <VStack alignItems="stretch" gap="1rem">
            {profiles.map((profile) => (
              <ProfileCard key={profile.discordAuthorId} profile={profile} />
            ))}
          </VStack>
        </>
      )}
    </VStack>
  )
}
