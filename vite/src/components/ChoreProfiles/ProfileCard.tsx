import { ChoreReactionList } from "@/components/ChoreReactionList";
import { ChoreProfile, useGetChoreProfileHistoryQuery } from "@/store/atlasApi";
import { Box, Collapse, Flex, HStack, Select, Text } from "@chakra-ui/react";
import { useState } from "react";

import { useChoreDateRange } from "@/helpers/useChoreDateRange";
import { DailyBarChart } from "./DailyBarChart";
import { HistoryLineChart } from "./HistoryLineChart";
import { DIFFICULTY_COLORS, EXCLUDED_REACTIONS } from "./constants";

export type GraphOption = 'daily' | 'averagePerDay' | 'weightedAveragePerDay'

export const GRAPH_OPTIONS: { value: GraphOption; label: string }[] = [
  { value: 'daily', label: 'Chores per day' },
  { value: 'averagePerDay', label: 'Avg / day (14d rolling)' },
  { value: 'weightedAveragePerDay', label: 'Weighted avg / day (14d rolling)' },
]

interface Props {
  profile: ChoreProfile;
  graph: GraphOption;
  onGraphChange: (g: GraphOption) => void;
}

const sizes: { label: string; key: keyof ChoreProfile; color: string }[] = [
  { label: "small", key: "small", color: DIFFICULTY_COLORS.small },
  { label: "medium", key: "medium", color: DIFFICULTY_COLORS.medium },
  { label: "large", key: "large", color: DIFFICULTY_COLORS.large },
  {
    label: "extra large",
    key: "extraLarge",
    color: DIFFICULTY_COLORS["extra large"],
  },
];

export function ProfileCard({ profile, graph, onGraphChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [from, , to] = useChoreDateRange();

  const isHistoryGraph = graph === 'averagePerDay' || graph === 'weightedAveragePerDay';
  const { data: historyData } = useGetChoreProfileHistoryQuery(
    { discordAuthorId: profile.discordAuthorId, from, to },
    { skip: !expanded || !isHistoryGraph || !from || !to },
  );

  const visibleReactions = Object.entries(profile.reactions).filter(
    ([emoji]) => !EXCLUDED_REACTIONS.has(emoji),
  );
  const totalReactions = visibleReactions.reduce((sum, [, n]) => sum + n, 0);

  return (
    <Box
      background="gray.50"
      borderRadius="md"
      borderLeft="4px solid"
      borderColor="blue.300"
      overflow="hidden"
    >
      <Box
        padding="1rem 1.25rem"
        cursor="pointer"
        onClick={() => setExpanded((v) => !v)}
        _hover={{ background: "gray.100" }}
      >
        <Flex
          justifyContent="space-between"
          alignItems="flex-start"
          flexWrap="wrap"
          gap="0.5rem"
          mb="0.75rem"
        >
          <HStack gap="0.5rem">
            <Text fontWeight="bold" fontSize="lg">
              {profile.discordAuthorName}
            </Text>
            <Text fontSize="sm" color="gray.400">
              {expanded ? "▲" : "▼"}
            </Text>
          </HStack>
          <HStack gap="1rem">
            <Box textAlign="center">
              <Text fontSize="xs" color="gray.500">
                Total
              </Text>
              <Text fontWeight="bold">{profile.total}</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="xs" color="gray.500">
                Avg/day
              </Text>
              <Text fontWeight="bold">{profile.averagePerDay}</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="xs" color="gray.500">
                Weighted avg/day
              </Text>
              <Text fontWeight="bold">{profile.weightedAveragePerDay}</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="xs" color="gray.500">
                % of chores
              </Text>
              <Text fontWeight="bold">{profile.percentOfTotal}%</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="xs" color="gray.500">
                Size-adjusted %
              </Text>
              <Text fontWeight="bold">
                {profile.sizeAdjustedPercentOfTotal}%
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="xs" color="gray.500">
                Zero days
              </Text>
              <Text
                fontWeight="bold"
                color={profile.zeroDays > 0 ? "orange.500" : "inherit"}
              >
                {profile.zeroDays}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="xs" color="gray.500">
                Votes cast
              </Text>
              <Text fontWeight="bold">{profile.voteCount}</Text>
            </Box>
          </HStack>
        </Flex>

        <HStack gap="0.75rem" flexWrap="wrap">
          {sizes.map(({ label, key, color }) => (
            <HStack key={label} gap="0.25rem">
              <Box
                width="10px"
                height="10px"
                borderRadius="2px"
                background={color}
                flexShrink={0}
              />
              <Text fontSize="sm" color="gray.600">
                {label}
              </Text>
              <Text fontSize="sm" fontWeight="semibold">
                {profile[key] as number}
              </Text>
            </HStack>
          ))}
        </HStack>

        {visibleReactions.length > 0 && (
          <HStack gap="0.75rem" flexWrap="wrap" marginTop="0.5rem">
            <Text fontSize="xs" color="gray.500" fontWeight="semibold">
              Reactions received:
            </Text>
            <Text fontSize="xs" fontWeight="bold" color="gray.700">
              {totalReactions}
            </Text>
            <ChoreReactionList
              reactions={profile.reactions}
              exclude={EXCLUDED_REACTIONS}
            />
          </HStack>
        )}
      </Box>

      <Collapse in={expanded} animateOpacity>
        <Box
          padding="0 1.25rem 1rem"
          borderTop="1px solid"
          borderColor="gray.200"
        >
          <Flex justifyContent="flex-start" paddingTop="0.75rem">
            <Select
              size="xs"
              width="220px"
              value={graph}
              onChange={(e) => onGraphChange(e.target.value as GraphOption)}
              onClick={(e) => e.stopPropagation()}
            >
              {GRAPH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </Flex>
          {graph === 'daily' && <DailyBarChart dailyData={profile.dailyData} />}
          {isHistoryGraph && (
            historyData
              ? <HistoryLineChart history={historyData.history} metric={graph} />
              : <Text fontSize="sm" color="gray.400" paddingTop="0.75rem">Loading…</Text>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
