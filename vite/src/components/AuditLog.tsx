import { useGetAuditLogQuery, AuditLogEntry } from '@/store/atlasApi'
import {
  Badge,
  Box,
  Button,
  Flex,
  Select,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'

const ACTION_LABELS: Record<string, string> = {
  CHORE_UPDATED: 'Chore Updated',
  CHORE_MESSAGE_REPROCESSED: 'Message Reprocessed',
  CHORE_MESSAGES_BULK_QUEUED: 'Bulk Import Queued',
  CHORE_DEFINITION_CREATED: 'Definition Created',
  CHORE_DEFINITION_UPDATED: 'Definition Updated',
  CHORE_DEFINITION_DELETED: 'Definition Deleted',
  ORGANIZATION_SETTINGS_UPDATED: 'Settings Updated',
  RSVP_COMPLETED: 'Member Joined',
}

const ACTION_COLORS: Record<string, string> = {
  CHORE_UPDATED: 'blue',
  CHORE_MESSAGE_REPROCESSED: 'purple',
  CHORE_MESSAGES_BULK_QUEUED: 'purple',
  CHORE_DEFINITION_CREATED: 'green',
  CHORE_DEFINITION_UPDATED: 'blue',
  CHORE_DEFINITION_DELETED: 'red',
  ORGANIZATION_SETTINGS_UPDATED: 'orange',
  RSVP_COMPLETED: 'teal',
}

const ALL_ACTIONS = Object.keys(ACTION_LABELS)

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function DiffView({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  const allKeys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ])

  if (allKeys.size === 0) return null

  return (
    <Box fontSize="xs" fontFamily="mono" marginTop="0.5rem">
      {[...allKeys].map((key) => {
        const prev = before?.[key]
        const next = after?.[key]
        const changed = JSON.stringify(prev) !== JSON.stringify(next)
        return (
          <Flex key={key} gap="0.5rem" alignItems="flex-start" paddingY="0.1rem">
            <Text color="gray.500" flexShrink={0} minWidth="120px">{key}</Text>
            {before && (
              <Text
                color={changed ? 'red.600' : 'gray.500'}
                textDecoration={changed ? 'line-through' : undefined}
                maxWidth="200px"
                noOfLines={2}
              >
                {prev === undefined ? '—' : JSON.stringify(prev)}
              </Text>
            )}
            {after && changed && (
              <>
                <Text color="gray.400" flexShrink={0}>→</Text>
                <Text color="green.700" maxWidth="200px" noOfLines={2}>
                  {next === undefined ? '—' : JSON.stringify(next)}
                </Text>
              </>
            )}
          </Flex>
        )
      })}
    </Box>
  )
}

function MetadataView({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata || Object.keys(metadata).length === 0) return null
  return (
    <Box fontSize="xs" fontFamily="mono" marginTop="0.5rem">
      {Object.entries(metadata).map(([k, v]) => (
        <Flex key={k} gap="0.5rem">
          <Text color="gray.500" flexShrink={0} minWidth="120px">{k}</Text>
          <Text color="gray.700">{JSON.stringify(v)}</Text>
        </Flex>
      ))}
    </Box>
  )
}

function EntryRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetail = entry.before || entry.after || entry.metadata

  // Pick a human-readable entity label from the data
  const entityLabel =
    (entry.after as { name?: string } | null)?.name ??
    (entry.before as { name?: string } | null)?.name ??
    (entry.after as { provider?: string } | null)?.provider ??
    entry.entityId?.slice(0, 8) ?? null

  return (
    <Box
      background="white"
      borderRadius="md"
      boxShadow="xs"
      padding="0.6rem 0.75rem"
      _hover={{ boxShadow: 'sm' }}
      transition="box-shadow 0.1s"
    >
      <Flex alignItems="center" gap="0.5rem" flexWrap="wrap">
        <Text fontSize="xs" color="gray.400" flexShrink={0} minWidth="120px">
          {formatDate(entry.createdAt)}
        </Text>
        <Text fontSize="sm" fontWeight="medium" color="gray.700" flexShrink={0}>
          {entry.userName ?? 'system'}
        </Text>
        <Badge colorScheme={ACTION_COLORS[entry.action] ?? 'gray'} fontSize="xs" flexShrink={0}>
          {ACTION_LABELS[entry.action] ?? entry.action}
        </Badge>
        {entityLabel && (
          <Text fontSize="xs" color="gray.500" noOfLines={1} flex="1" minWidth={0}>
            {entityLabel}
          </Text>
        )}
        {hasDetail && (
          <Button
            size="xs"
            variant="ghost"
            colorScheme="gray"
            flexShrink={0}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'hide' : 'details'}
          </Button>
        )}
      </Flex>
      {expanded && (
        <Box marginTop="0.5rem" paddingTop="0.5rem" borderTop="1px solid" borderColor="gray.100">
          {(entry.before || entry.after) && (
            <DiffView before={entry.before} after={entry.after} />
          )}
          {entry.metadata && !entry.before && !entry.after && (
            <MetadataView metadata={entry.metadata} />
          )}
        </Box>
      )}
    </Box>
  )
}

const LIMIT = 25

export function AuditLogPanel() {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')

  const { data, isLoading } = useGetAuditLogQuery({
    page,
    limit: LIMIT,
    action: actionFilter || undefined,
  })

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1

  return (
    <Box padding="1.5rem" maxWidth="900px" margin="0 auto">
      <Flex alignItems="center" justifyContent="space-between" marginBottom="1rem" flexWrap="wrap" gap="0.5rem">
        <Text fontSize="xl" fontWeight="bold">Audit Log</Text>
        <Select
          size="sm"
          width="220px"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
        >
          <option value="">All actions</option>
          {ALL_ACTIONS.map((a) => (
            <option key={a} value={a}>{ACTION_LABELS[a]}</option>
          ))}
        </Select>
      </Flex>

      {isLoading ? (
        <Flex justifyContent="center" padding="3rem">
          <Spinner />
        </Flex>
      ) : data?.data.length === 0 ? (
        <Text color="gray.500" fontSize="sm" textAlign="center" marginTop="2rem">
          No audit log entries yet.
        </Text>
      ) : (
        <VStack spacing="0.35rem" align="stretch">
          {data?.data.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </VStack>
      )}

      {data && data.total > LIMIT && (
        <Flex justifyContent="center" alignItems="center" gap="1rem" marginTop="1.5rem">
          <Button size="sm" variant="outline" isDisabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <Text fontSize="sm" color="gray.600">
            Page {page} of {totalPages}
          </Text>
          <Button size="sm" variant="outline" isDisabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </Flex>
      )}
    </Box>
  )
}
