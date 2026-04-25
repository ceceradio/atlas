import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
} from '@chakra-ui/react'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useGetAuthorsQuery, useGetMembersQuery, useUpdateUserMutation, useWhoamiQuery } from '@/store/atlasApi'
import { selectToken } from '@/store/authSlice'

export const DISCORD_SETUP_DISMISSED_KEY = 'atlas_discord_setup_dismissed'

export function DiscordSetupModal() {
  const token = useSelector(selectToken)
  const { data: currentUser } = useWhoamiQuery(undefined, { skip: !token })
  const needsDiscord = !!currentUser && !currentUser.discordUsername
  const { data: authors = [] } = useGetAuthorsQuery(undefined, { skip: !needsDiscord })
  const { data: members = [] } = useGetMembersQuery(undefined, { skip: !needsDiscord })
  const [updateUser, { isLoading }] = useUpdateUserMutation()
  const [selected, setSelected] = useState('')
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(DISCORD_SETUP_DISMISSED_KEY))

  const claimedNames = new Set(
    members
      .filter((m) => m.uuid !== currentUser?.uuid && m.discordUsername)
      .map((m) => m.discordUsername as string),
  )
  const availableAuthors = authors.filter((a) => !claimedNames.has(a.discordAuthorName))
  const isOpen = needsDiscord && availableAuthors.length > 0 && !dismissed

  const handleSave = async () => {
    if (!selected) return
    await updateUser({ discordUsername: selected })
  }

  const handleDismiss = () => {
    localStorage.setItem(DISCORD_SETUP_DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <Modal isOpen={isOpen} onClose={handleDismiss} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Link your Discord account</ModalHeader>
        <ModalBody>
          <Text mb={3} fontSize="sm" color="gray.600">
            Select your Discord username to connect your account to your chore history.
          </Text>
          <Select
            placeholder="Select your username"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {availableAuthors.map((a) => (
              <option key={a.discordAuthorId} value={a.discordAuthorName}>
                {a.discordAuthorName}
              </option>
            ))}
          </Select>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Skip for now
          </Button>
          <Button
            colorScheme="blue"
            size="sm"
            onClick={handleSave}
            isDisabled={!selected}
            isLoading={isLoading}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
