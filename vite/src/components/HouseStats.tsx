import { useChoreDateRange } from "@/helpers/useChoreDateRange";
import { useGetChoreProfilesQuery } from "@/store/atlasApi";
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useMemo } from "react";
import { DailyBarChart } from "./ChoreProfiles/DailyBarChart";
import { DAILY_WEIGHTS } from "./ChoreProfiles/constants";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Box
      background="white"
      borderRadius="lg"
      boxShadow="sm"
      padding="1.25rem 1.5rem"
      textAlign="center"
      flex="1"
      minWidth="140px"
    >
      <Text
        fontSize="xs"
        color="gray.500"
        fontWeight="semibold"
        textTransform="uppercase"
        letterSpacing="wide"
        mb="0.4rem"
      >
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="bold" color="gray.800">
        {value}
      </Text>
    </Box>
  );
}

export function HouseStatsPanel() {
  const [from, setFrom, to, setTo] = useChoreDateRange();

  const { data, isLoading } = useGetChoreProfilesQuery({
    from: from || undefined,
    to: to || undefined,
  });

  const profiles = data?.profiles ?? [];
  const days = data?.days ?? 1;

  const totalChores = useMemo(
    () => profiles.reduce((sum, p) => sum + p.total, 0),
    [profiles],
  );

  const avgPerDay = useMemo(
    () => (days > 0 ? parseFloat((totalChores / days).toFixed(2)) : 0),
    [totalChores, days],
  );

  const weightedAvgPerDay = useMemo(
    () =>
      parseFloat(
        profiles
          .reduce((sum, p) => sum + p.weightedAveragePerDay, 0)
          .toFixed(2),
      ),
    [profiles],
  );

  const totalWeighted = useMemo(
    () =>
      profiles.reduce((sum, p) => {
        return (
          sum +
          p.small * DAILY_WEIGHTS.small +
          p.medium * DAILY_WEIGHTS.medium +
          p.large * DAILY_WEIGHTS.large +
          p.extraLarge * DAILY_WEIGHTS.extraLarge
        );
      }, 0),
    [profiles],
  );

  // Merge daily data across all members by date
  const mergedDailyData = useMemo(() => {
    const byDate = new Map<
      string,
      {
        date: string;
        small: number;
        medium: number;
        large: number;
        extraLarge: number;
      }
    >();
    for (const profile of profiles) {
      for (const day of profile.dailyData) {
        const existing = byDate.get(day.date) ?? {
          date: day.date,
          small: 0,
          medium: 0,
          large: 0,
          extraLarge: 0,
        };
        byDate.set(day.date, {
          date: day.date,
          small: existing.small + day.small,
          medium: existing.medium + day.medium,
          large: existing.large + day.large,
          extraLarge: existing.extraLarge + day.extraLarge,
        });
      }
    }
    return Array.from(byDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }, [profiles]);

  return (
    <VStack padding="1.5rem" alignItems="stretch" gap="1.5rem">
      {/* Filters */}
      <Box
        background="white"
        borderRadius="lg"
        boxShadow="sm"
        padding="1.25rem"
      >
        <Text fontSize="xl" fontWeight="bold" marginBottom="0.75rem">
          House Stats
        </Text>
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
              const today = new Date().toISOString().slice(0, 10);
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              setFrom(thirtyDaysAgo.toISOString().slice(0, 10));
              setTo(today);
            }}
          >
            Last 30 days
          </Button>
          {data?.days != null && (
            <Text fontSize="sm" color="gray.500">
              {data.days} day{data.days !== 1 ? "s" : ""}
            </Text>
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
          {/* Summary stats */}
          <Flex gap="1rem" flexWrap="wrap">
            <StatCard label="Total chores" value={totalChores} />
            <StatCard label="Avg chores / day" value={avgPerDay} />
            <StatCard label="Weighted avg" value={weightedAvgPerDay} />
            <StatCard label="Total weighted" value={totalWeighted} />
            <StatCard label="Days tracked" value={days} />
          </Flex>

          {/* Combined daily bar chart */}
          <Box
            background="white"
            borderRadius="lg"
            boxShadow="sm"
            padding="1.25rem"
          >
            <Text
              fontSize="md"
              fontWeight="semibold"
              color="gray.700"
              mb="0.25rem"
            >
              House activity
            </Text>
            <Text fontSize="xs" color="gray.500" mb="0.25rem">
              All members combined
            </Text>
            <DailyBarChart dailyData={mergedDailyData} />
          </Box>
        </>
      )}
    </VStack>
  );
}
