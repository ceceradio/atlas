'use client'
import { ConversationPanel, getConversations } from '@/components/conversation'
import { SidePanel } from '@/components/sidepanel'
import { IConversation } from '@atlas/api'
import { useAuth0 } from '@auth0/auth0-react'
import { Box, Flex } from '@chakra-ui/react'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Zone() {
  const { uuid } = useParams()
  const { getAccessTokenSilently } = useAuth0()
  const [conversations, setConversations] = useState([] as IConversation[])
  useEffect(() => {
    getAccessTokenSilently().then(getConversations).then(setConversations)
  }, [getAccessTokenSilently])
  return (
    <Flex>
      <Box width="xs">
        <SidePanel list={conversations} />
      </Box>
      <Box flex="1">
        <ConversationPanel uuid={uuid} />
      </Box>
    </Flex>
  )
}
