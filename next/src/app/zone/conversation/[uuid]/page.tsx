'use client'
import { ConversationPanel } from '@/components/conversation'
import { SidePanel } from '@/components/sidepanel'
import { Box, Flex } from '@chakra-ui/react'
import { useParams } from 'next/navigation'

export default function ConversationDetails() {
  const { uuid } = useParams()
  return (
    <Flex>
      <Box width="xs">
        <SidePanel />
      </Box>
      <Box flex="1">
        <ConversationPanel uuid={uuid} />
      </Box>
    </Flex>
  )
}
