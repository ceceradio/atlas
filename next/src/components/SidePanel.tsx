import { getConversations } from '@/client/conversations'
import useAtlasApi from '@/helpers/useAtlasApi'
import useAtlasSocket from '@/helpers/useAtlasSocket'
import { AtlasSocketMessage, IAPIConversation, IConversation } from '@atlas/api'
import { Box, Button, Divider, Flex, IconButton, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { PropsWithChildren, useCallback, useEffect, useState } from 'react'

type SidePanelProps = {
  list: IConversation[]
  onNavigate?: () => void
}
export function SidePanel({ onNavigate }: { onNavigate?: () => void }) {
  const { token } = useAtlasApi()
  const { lastJsonMessage } = useAtlasSocket()
  const [list, setList] = useState([] as IAPIConversation[])
  const getList = useCallback(() => {
    if (token) getConversations(token).then(setList)
  }, [token])

  useEffect(() => {
    if (token) getList()
  }, [token, getList])

  useEffect(() => {
    const message = lastJsonMessage as AtlasSocketMessage<unknown>
    if (message && message.type === 'update') {
      getList()
    }
  }, [lastJsonMessage, getList])

  return <SidePanelDisplay list={list} onNavigate={onNavigate} />
}

function SidePanelDisplay({ list, onNavigate }: SidePanelProps) {
  const router = useRouter()

  const navigate = (path: string) => {
    router.push(path)
    onNavigate?.()
  }

  return (
    <VStack padding="1rem" alignItems="flex-end" height="100%" overflowY="auto">
      <Box width="100%">
        <Button width="100%" onClick={() => navigate('/zone')}>New Chat</Button>
      </Box>
      {list.length > 0 &&
        list.slice(0, 5).map((conversation) => {
          const { uuid, title, creator } = conversation
          return (
            <Box key={uuid} width="100%">
              <Button
                onClick={() => navigate(`/zone/conversation/${uuid}`)}
                width="100%"
                justifyContent="flex-start"
                flexDirection="column"
                alignItems="flex-start"
                height="auto"
                padding="0.5rem 0.75rem"
                whiteSpace="normal"
                textAlign="left"
              >
                <Box fontSize="sm" noOfLines={1}>{title}</Box>
                {creator && (
                  <Box fontSize="xs" color="gray.500" fontWeight="normal">
                    {creator.name}
                  </Box>
                )}
              </Button>
            </Box>
          )
        })}
      <Divider />
      <Box>
        <Button onClick={() => navigate('/zone/chores')}>Chores</Button>
      </Box>
      <Box>
        <Button onClick={() => navigate('/zone/chore-messages')}>Chore Messages</Button>
      </Box>
      <Box>
        <Button onClick={() => navigate('/zone/chore-import')}>Import Chores</Button>
      </Box>
      <Box alignSelf="bottom">Settings</Box>
    </VStack>
  )
}

export function SidePanelPage({ children }: PropsWithChildren) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <Flex minHeight="100vh">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <Box
          display={{ base: 'block', md: 'none' }}
          position="fixed"
          inset={0}
          zIndex={9}
          background="blackAlpha.500"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Box
        background="#ddd"
        height="100vh"
        width={{ base: '280px', md: '350px' }}
        position={{ base: 'fixed', md: 'sticky' }}
        top={0}
        left={0}
        zIndex={{ base: 10, md: 1 }}
        transform={{
          base: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          md: 'none',
        }}
        transition="transform 0.2s ease"
        flexShrink={0}
      >
        <SidePanel onNavigate={() => setSidebarOpen(false)} />
      </Box>

      {/* Main content */}
      <Box flex="1" minWidth={0} display="flex" flexDirection="column">
        {/* Mobile header */}
        <Flex
          display={{ base: 'flex', md: 'none' }}
          padding="0.5rem"
          background="#eee"
          alignItems="center"
        >
          <IconButton
            aria-label="Open menu"
            icon={<HamburgerIcon />}
            variant="ghost"
            onClick={() => setSidebarOpen(true)}
          />
        </Flex>
        {children}
      </Box>
    </Flex>
  )
}

function HamburgerIcon() {
  return (
    <Flex flexDirection="column" gap="4px" width="18px">
      <Box height="2px" background="currentColor" borderRadius="1px" />
      <Box height="2px" background="currentColor" borderRadius="1px" />
      <Box height="2px" background="currentColor" borderRadius="1px" />
    </Flex>
  )
}
