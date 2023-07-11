'use client'
import { ConversationPanel } from '@/components/conversation'
import { SidePanel } from '@/components/sidepanel'
import { Box, Flex } from '@chakra-ui/react'

export default function Zone() {
  return (
    <Flex>
      <Box width="xs">
        <SidePanel />
      </Box>
      <Box flex="1">
        <ConversationPanel />
      </Box>
    </Flex>
  )
}
