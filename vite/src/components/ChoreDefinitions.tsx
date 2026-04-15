import {
  useGetChoreDefinitionsQuery,
  useCreateChoreDefinitionMutation,
  useUpdateChoreDefinitionMutation,
  useDeleteChoreDefinitionMutation,
  useGetOrganizationQuery,
  useUpdateOrganizationSettingsMutation,
  useGetDiscordChannelsQuery,
} from '@/store/atlasApi'
import { FilterableSelect } from '@/components/FilterableSelect'
import { IChoreDefinition, ChoreDifficulty } from '@atlas/api'
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  Select,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'

const SIZE_ORDER: (ChoreDifficulty | null)[] = ['not a chore', 'small', 'medium', 'large', 'extra large']

const SIZE_LABELS: Record<string, string> = {
  'not a chore': 'Not a Chore',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  'extra large': 'Extra Large',
}

const SIZE_COLORS: Record<string, string> = {
  'not a chore': 'gray',
  small: 'green',
  medium: 'blue',
  large: 'orange',
  'extra large': 'red',
}

function SizeBadge({ size }: { size: ChoreDifficulty | null }) {
  if (!size) return <Badge colorScheme="purple">unrated</Badge>
  return <Badge colorScheme={SIZE_COLORS[size]}>{SIZE_LABELS[size]}</Badge>
}

function DefinitionRow({
  def,
  aliases = [],
  isAlias = false,
}: {
  def: IChoreDefinition
  aliases?: IChoreDefinition[]
  isAlias?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(def.name)
  const [size, setSize] = useState<ChoreDifficulty | ''>(def.size ?? '')
  const [aliasOfId, setAliasOfId] = useState<string>(def.aliasOfId ?? '')
  const [aliasesOpen, setAliasesOpen] = useState(false)
  const [updateDef, { isLoading: saving }] = useUpdateChoreDefinitionMutation()
  const [deleteDef, { isLoading: deleting }] = useDeleteChoreDefinitionMutation()
  const { data: allDefs = [] } = useGetChoreDefinitionsQuery()

  // Canonicals only — exclude self and existing aliases
  const canonicalOptions = allDefs.filter((d) => d.aliasOfId === null && d.id !== def.id)

  const handleSave = async () => {
    await updateDef({
      id: def.id,
      patch: {
        name: name.trim(),
        size: size === '' ? null : size,
        aliasOfId: aliasOfId === '' ? null : aliasOfId,
      },
    })
    setEditing(false)
  }

  const handleCancel = () => {
    setName(def.name)
    setSize(def.size ?? '')
    setAliasOfId(def.aliasOfId ?? '')
    setEditing(false)
  }

  if (editing) {
    return (
      <Box>
        <Flex
          padding="0.5rem 0.75rem"
          background="white"
          borderRadius="md"
          boxShadow="sm"
          gap="0.5rem"
          alignItems="flex-start"
          flexWrap="wrap"
        >
          <Input
            size="sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            flex="1"
            minWidth="200px"
          />
          <Select
            size="sm"
            value={size}
            onChange={(e) => setSize(e.target.value as ChoreDifficulty | '')}
            width="150px"
            flexShrink={0}
            isDisabled={!!aliasOfId}
          >
            <option value="">unrated</option>
            {SIZE_ORDER.filter(Boolean).map((s) => (
              <option key={s!} value={s!}>{SIZE_LABELS[s!]}</option>
            ))}
          </Select>
          <Box width="220px" flexShrink={0}>
            <FilterableSelect
              options={canonicalOptions.map((d) => ({ value: d.id, label: d.name }))}
              value={aliasOfId}
              onChange={setAliasOfId}
              placeholder="— not an alias —"
              emptyLabel="— not an alias —"
              isDisabled={aliases.length > 0}
              title={aliases.length > 0 ? 'Cannot alias a definition that has aliases' : undefined}
            />
          </Box>
          <Button size="sm" colorScheme="blue" onClick={handleSave} isLoading={saving}>Save</Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
        </Flex>
      </Box>
    )
  }

  return (
    <Box
      marginLeft={isAlias ? '1.5rem' : undefined}
      borderLeft={isAlias ? '2px solid' : undefined}
      borderColor={isAlias ? 'gray.200' : undefined}
      paddingLeft={isAlias ? '0.5rem' : undefined}
    >
      <Flex
        padding="0.5rem 0.75rem"
        background={isAlias ? 'gray.50' : 'white'}
        borderRadius="md"
        boxShadow="xs"
        gap="0.5rem"
        alignItems="center"
        _hover={{ boxShadow: 'sm' }}
      >
        {aliases.length > 0 && (
          <IconButton
            aria-label={aliasesOpen ? 'Collapse aliases' : 'Expand aliases'}
            size="xs"
            variant="ghost"
            onClick={() => setAliasesOpen((o) => !o)}
            icon={<ChevronIcon open={aliasesOpen} />}
          />
        )}
        <Text fontSize="sm" flex="1" wordBreak="break-word">{def.name}</Text>
        {isAlias ? (
          <Badge colorScheme="purple" variant="outline" fontSize="xs">alias</Badge>
        ) : (
          <SizeBadge size={def.size} />
        )}
        {aliases.length > 0 && (
          <Badge colorScheme="gray" variant="subtle" fontSize="xs">{aliases.length} alias{aliases.length !== 1 ? 'es' : ''}</Badge>
        )}
        <IconButton
          aria-label="Edit"
          size="xs"
          variant="ghost"
          onClick={() => setEditing(true)}
          icon={<EditIcon />}
        />
        <IconButton
          aria-label="Delete"
          size="xs"
          variant="ghost"
          colorScheme="red"
          isLoading={deleting}
          onClick={() => deleteDef(def.id)}
          icon={<TrashIcon />}
        />
      </Flex>
      {aliasesOpen && aliases.length > 0 && (
        <VStack spacing="0.25rem" align="stretch" marginTop="0.25rem">
          {aliases.map((alias) => (
            <DefinitionRow key={alias.id} def={alias} isAlias />
          ))}
        </VStack>
      )}
    </Box>
  )
}

function AddDefinitionForm() {
  const [name, setName] = useState('')
  const [size, setSize] = useState<ChoreDifficulty | ''>('')
  const [aliasOfId, setAliasOfId] = useState('')
  const [createDef, { isLoading }] = useCreateChoreDefinitionMutation()
  const { data: allDefs = [] } = useGetChoreDefinitionsQuery()
  const [error, setError] = useState<string | null>(null)

  const canonicalOptions = allDefs.filter((d) => d.aliasOfId === null)

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setError(null)
    try {
      await createDef({
        name: trimmed,
        size: aliasOfId ? undefined : (size === '' ? undefined : size),
        aliasOfId: aliasOfId || null,
      }).unwrap()
      setName('')
      setSize('')
      setAliasOfId('')
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } }
      setError(e?.data?.error ?? 'Failed to create definition')
    }
  }

  return (
    <Flex gap="0.5rem" alignItems="flex-start" flexWrap="wrap">
      <Box flex="1" minWidth="200px">
        <Input
          size="sm"
          placeholder="Chore name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          isInvalid={!!error}
        />
        {error && <Text fontSize="xs" color="red.500" marginTop="0.25rem">{error}</Text>}
      </Box>
      <Select
        size="sm"
        value={size}
        onChange={(e) => setSize(e.target.value as ChoreDifficulty | '')}
        width="150px"
        flexShrink={0}
        isDisabled={!!aliasOfId}
      >
        <option value="">unrated</option>
        {SIZE_ORDER.filter(Boolean).map((s) => (
          <option key={s!} value={s!}>{SIZE_LABELS[s!]}</option>
        ))}
      </Select>
      <Box width="220px" flexShrink={0}>
        <FilterableSelect
          options={canonicalOptions.map((d) => ({ value: d.id, label: d.name }))}
          value={aliasOfId}
          onChange={setAliasOfId}
          placeholder="— not an alias —"
          emptyLabel="— not an alias —"
        />
      </Box>
      <Button size="sm" colorScheme="blue" onClick={handleAdd} isLoading={isLoading} flexShrink={0}>
        Add
      </Button>
    </Flex>
  )
}

function SectionHeading({ label }: { label: string }) {
  return (
    <Flex alignItems="center" gap="0.5rem" marginY="0.5rem">
      <Box height="1px" flex="1" background="gray.300" />
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" whiteSpace="nowrap" flexShrink={0}>
        {label}
      </Text>
      <Box height="1px" flex="1" background="gray.300" />
    </Flex>
  )
}

function VoteChannelSettings() {
  const { data: org } = useGetOrganizationQuery()
  const { data: discordChannels = [] } = useGetDiscordChannelsQuery()
  const [updateSettings, { isLoading: saving }] = useUpdateOrganizationSettingsMutation()
  const [channelId, setChannelId] = useState('')

  useEffect(() => {
    if (org) setChannelId(org.settings?.discord?.choreDefinitionsChannelId ?? '')
  }, [org])

  async function save() {
    await updateSettings({
      ...org?.settings,
      discord: { ...org?.settings?.discord, choreDefinitionsChannelId: channelId || undefined },
    })
  }

  return (
    <Box background="gray.50" borderRadius="lg" padding="1rem" marginBottom="1.5rem" boxShadow="xs">
      <Text fontSize="sm" fontWeight="semibold" color="gray.600" marginBottom="0.5rem">
        Discord voting channel
      </Text>
      <HStack>
        <Select
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          placeholder="Select a channel..."
          flex="1"
          size="sm"
        >
          {discordChannels.map((c) => (
            <option key={c.id} value={c.id}>#{c.name} — {c.guildName}</option>
          ))}
        </Select>
        <Button size="sm" colorScheme="blue" isLoading={saving} onClick={save} flexShrink={0}>
          Save
        </Button>
      </HStack>
    </Box>
  )
}

export function ChoreDefinitionsPanel() {
  const { data: definitions = [], isLoading } = useGetChoreDefinitionsQuery()

  // Split canonicals from aliases
  const canonicals = definitions.filter((d) => d.aliasOfId === null)
  const aliasesByCanonical = new Map<string, IChoreDefinition[]>()
  for (const d of definitions) {
    if (d.aliasOfId) {
      const list = aliasesByCanonical.get(d.aliasOfId) ?? []
      list.push(d)
      aliasesByCanonical.set(d.aliasOfId, list)
    }
  }

  const unrated = canonicals.filter((d) => d.size === null)
  const notAChore = canonicals.filter((d) => d.size === 'not a chore')
  const sized = canonicals.filter((d) => d.size !== null && d.size !== 'not a chore')

  const bySize = SIZE_ORDER.filter((s) => s && s !== 'not a chore').map((size) => ({
    size: size!,
    items: sized.filter((d) => d.size === size),
  })).filter((group) => group.items.length > 0)

  if (isLoading) {
    return (
      <Flex padding="2rem" justifyContent="center">
        <Spinner />
      </Flex>
    )
  }

  return (
    <Box padding="1.5rem" maxWidth="800px" margin="0 auto">
      <Text fontSize="xl" fontWeight="bold" marginBottom="1rem">Chore Definitions</Text>

      <VoteChannelSettings />

      <Box background="gray.50" borderRadius="lg" padding="1rem" marginBottom="1.5rem" boxShadow="xs">
        <Text fontSize="sm" fontWeight="semibold" color="gray.600" marginBottom="0.5rem">Add definition</Text>
        <AddDefinitionForm />
      </Box>

      {unrated.length > 0 && (
        <Box marginBottom="1rem">
          <SectionHeading label="Unrated" />
          <VStack spacing="0.35rem" align="stretch">
            {unrated.map((def) => (
              <DefinitionRow key={def.id} def={def} aliases={aliasesByCanonical.get(def.id)} />
            ))}
          </VStack>
        </Box>
      )}

      {bySize.map(({ size, items }) => (
        <Box key={size} marginBottom="1rem">
          <SectionHeading label={SIZE_LABELS[size]} />
          <VStack spacing="0.35rem" align="stretch">
            {items.map((def) => (
              <DefinitionRow key={def.id} def={def} aliases={aliasesByCanonical.get(def.id)} />
            ))}
          </VStack>
        </Box>
      ))}

      {notAChore.length > 0 && (
        <Box marginBottom="1rem">
          <SectionHeading label="Not a Chore" />
          <VStack spacing="0.35rem" align="stretch">
            {notAChore.map((def) => (
              <DefinitionRow key={def.id} def={def} aliases={aliasesByCanonical.get(def.id)} />
            ))}
          </VStack>
        </Box>
      )}

      {definitions.length === 0 && (
        <Text color="gray.500" fontSize="sm" textAlign="center" marginTop="2rem">
          No chore definitions yet. Add one above or run the seed script.
        </Text>
      )}
    </Box>
  )
}

// Minimal inline icon components to avoid extra deps
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
