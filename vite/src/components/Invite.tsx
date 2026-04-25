import {
  Box,
  Button,
  Divider,
  Flex,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useCreateInviteMutation, useGetInvitesQuery, useGetMembersQuery, useRevokeInviteMutation, OrgMember, PendingInvite } from '@/store/atlasApi'
import { GemIcon } from './GemIcon'

function inviteUrl(inviteCode: string) {
  return `${window.location.origin}/rsvp?inviteCode=${inviteCode}`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Button size="sm" onClick={copy} flexShrink={0} width="80px">
      {copied ? 'Copied!' : 'Copy'}
    </Button>
  )
}

function InviteRow({ invite }: { invite: PendingInvite }) {
  const [revoke, { isLoading }] = useRevokeInviteMutation()
  const url = inviteUrl(invite.inviteCode)

  return (
    <Box padding="0.5rem 0" borderBottom="1px solid" borderColor="gray.200">
      <Flex justifyContent="space-between" alignItems="center" gap="0.5rem">
        <Box flex="1" minWidth={0}>
          <Text fontWeight="medium" fontSize="sm">{invite.name}</Text>
          <Text fontSize="xs" color="gray.500" noOfLines={1}>{url}</Text>
        </Box>
        <Flex gap="0.5rem" flexShrink={0}>
          <CopyButton text={url} />
          <Button
            size="sm"
            variant="ghost"
            colorScheme="red"
            isLoading={isLoading}
            onClick={() => revoke(invite.uuid)}
          >
            Revoke
          </Button>
        </Flex>
      </Flex>
    </Box>
  )
}

const paper = {
  background: 'white',
  borderRadius: 'lg',
  boxShadow: 'sm',
  padding: '1.25rem',
}

function MembersPanel({ members }: { members: OrgMember[] }) {
  return (
    <Box {...paper} width="100%">
      <Text fontSize="lg" fontWeight="semibold" marginBottom="0.75rem">Members</Text>
      <VStack alignItems="stretch" gap="0">
        {members.map((member, i) => (
          <Box key={member.uuid}>
            {i > 0 && <Divider />}
            <Flex paddingY="0.5rem" alignItems="center" gap="0.5rem">
              <GemIcon color={member.color || '#b0bec5'} />
              <Box>
                <Text fontSize="sm">
                  <Text as="span" fontWeight="medium">{member.name}</Text>
                  {member.discordUsername && (
                    <Text as="span" color="gray.500"> ({member.discordUsername})</Text>
                  )}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Joined {new Date(member.created).toLocaleDateString()}
                </Text>
              </Box>
            </Flex>
          </Box>
        ))}
      </VStack>
    </Box>
  )
}

export function InvitePanel() {
  const [name, setName] = useState('')
  const [newInvite, setNewInvite] = useState<{ url: string; name: string } | null>(null)
  const { data: invites = [] } = useGetInvitesQuery()
  const { data: members = [] } = useGetMembersQuery()
  const [createInvite, { isLoading }] = useCreateInviteMutation()
  const { logout } = useAuth0()

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const result = await createInvite(trimmed).unwrap()
    setNewInvite({ url: inviteUrl(result.inviteCode), name: result.name })
    setName('')
  }

  return (
    <Flex padding="1.5rem" gap="1.5rem" alignItems="flex-start" flexDirection="column">
      <Flex width="100%" justifyContent="flex-end">
        <Button size="sm" variant="ghost" colorScheme="gray" onClick={() => logout({ logoutParams: { returnTo: 'https://chocolate.local:8443' } })}>
          Log out
        </Button>
      </Flex>
      <Flex gap="1.5rem" alignItems="flex-start" width="100%">
        <VStack alignItems="stretch" gap="1.5rem" flex="1" maxWidth="520px">
        <Box {...paper}>
          <Text fontSize="lg" fontWeight="semibold" marginBottom="0.75rem">Invite someone</Text>
          <Box
            background="orange.50"
            border="1px solid"
            borderColor="orange.200"
            borderRadius="md"
            padding="0.75rem 1rem"
            marginBottom="0.75rem"
          >
            <Text fontSize="sm" color="orange.800">
              Invited users will see everything you see and be able to do everything you can do: have chats, scan and edit chores, and invite other users. Be careful!
            </Text>
          </Box>
          <Flex gap="0.5rem">
            <Input
              placeholder="Their name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button onClick={handleCreate} isLoading={isLoading} isDisabled={!name.trim()} flexShrink={0}>
              Generate
            </Button>
          </Flex>

          {newInvite && (
            <Box marginTop="0.75rem" padding="0.75rem" background="gray.50" borderRadius="md">
              <Text fontSize="sm" fontWeight="medium" marginBottom="0.4rem">
                Invite link for {newInvite.name}
              </Text>
              <Flex gap="0.5rem" alignItems="center">
                <Input
                  value={newInvite.url}
                  isReadOnly
                  fontSize="sm"
                  size="sm"
                  onFocus={(e) => e.target.select()}
                />
                <CopyButton text={newInvite.url} />
              </Flex>
            </Box>
          )}
        </Box>

        {invites.length > 0 && (
          <Box {...paper}>
            <Text fontSize="sm" fontWeight="semibold" color="gray.600" marginBottom="0.5rem">
              Pending invites
            </Text>
            {invites.map((invite) => (
              <InviteRow key={invite.uuid} invite={invite} />
            ))}
          </Box>
        )}
        </VStack>

        {members.length > 0 && (
          <Box flex="1">
            <MembersPanel members={members} />
          </Box>
        )}
      </Flex>
    </Flex>
  )
}
