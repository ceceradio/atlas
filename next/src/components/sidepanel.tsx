import { getConversations } from '@/client/conversatons'
import useAtlasApi from '@/helpers/useAtlasApi'
import useAtlasSocket from '@/helpers/useAtlasSocket'
import { AtlasSocketMessage, IAPIConversation, IConversation } from '@atlas/api'
import { Box, Button, Divider, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

type SidePanelProps = {
  list: IConversation[]
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
  return <SidePanelDisplay list={list} />
}

function SidePanelDisplay({ list }: SidePanelProps) {
  const router = useRouter()

  return (
    <VStack>
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
      <Box>
        <Button onClick={() => router.push(`/zone`)}>Back to the Zone</Button>
      </Box>
      <Box alignSelf="bottom">Settings</Box>
    </VStack>
  )
}
