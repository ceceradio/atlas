import { getConversations } from '@/client/conversations'
import useAtlasApi from '@/helpers/useAtlasApi'
import useAtlasSocket from '@/helpers/useAtlasSocket'
import { AtlasSocketMessage, IAPIConversation, IConversation } from '@atlas/api'
import { Box, Button, Divider, Flex, VStack } from '@chakra-ui/react'
import styled from '@emotion/styled'
import { useRouter } from 'next/navigation'
import { PropsWithChildren, useCallback, useEffect, useState } from 'react'

type SidePanelProps = {
  list: IConversation[]
  showBack: boolean
}
export function SidePanel() {
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

  return <SidePanelDisplay list={list} showBack={true} />
}

function SidePanelDisplay({ showBack, list }: SidePanelProps) {
  const router = useRouter()

  return (
    <VStack padding="1rem" alignItems="flex-end">
      {showBack && (
        <Box>
          <Button onClick={() => router.push(`/zone`)}>Back</Button>
        </Box>
      )}
      {list.length &&
        list.slice(0, 5).map((conversation) => {
          const { uuid, title } = conversation
          return (
            <Box key={uuid}>
              <Button onClick={() => router.push(`/zone/conversation/${uuid}`)}>
                {title}
              </Button>
            </Box>
          )
        })}
      <Divider />
      <Box alignSelf="bottom">Settings</Box>
    </VStack>
  )
}

export function SidePanelPage({ children }: PropsWithChildren) {
  const [slidden, setMobileHidden] = useState(true)
  return (
    <Flex>
      <SlideBoxContainer
        onClick={() => setMobileHidden(!slidden)}
        slidden={slidden}
      >
        <SlideBox slidden={slidden}>
          <SidePanel />
        </SlideBox>
      </SlideBoxContainer>
      <Box flex="1">{children}</Box>
    </Flex>
  )
}

const SlideBox = styled.div(({ slidden }: { slidden: boolean }) => ({
  background: '#ddd',
  height: '100vh',
  width: '350px',
  position: 'sticky',
  top: 0,
  transform: `translateX(${slidden ? '-300px' : '0'})`,
  transition: 'width 333ms ease-in-out, transform 333ms ease-in-out',
}))

const SlideBoxContainer = styled.div(({ slidden }: { slidden: boolean }) => ({
  width: `${slidden ? '50px' : '350px'}`,
}))
